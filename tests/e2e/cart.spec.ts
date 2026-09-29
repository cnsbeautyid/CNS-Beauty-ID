import AxeBuilder from "@axe-core/playwright";
import { loadEnvConfig } from "@next/env";
import { expect, test, type BrowserContext } from "@playwright/test";

loadEnvConfig(process.cwd());

const CART_COOKIE = "cns_cart";

type LiveProduct = { id: string; name: string; slug: string };

// A real active product from the public catalog (publishable key + RLS).
async function firstActiveProduct(): Promise<LiveProduct | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/products?select=id,name,slug&status=eq.active&order=name&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return null;
  const [product] = (await response.json()) as LiveProduct[];
  return product ?? null;
}

async function seedCart(context: BrowserContext, baseURL: string, value: unknown) {
  await context.addCookies([
    { name: CART_COOKIE, value: encodeURIComponent(JSON.stringify(value)), url: baseURL, httpOnly: true, sameSite: "Lax" },
  ]);
}

test.describe("Cart", () => {
  test("an empty cart invites the customer to explore", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keranjang");
    await expect(page.getByText("Keranjangmu masih kosong")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Jelajahi Produk" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Keranjang", exact: true })).toBeVisible();
  });

  test("a tampered cart cookie is treated as an empty cart", async ({ page, context, baseURL }) => {
    await seedCart(context, baseURL!, { v: 1, items: [{ p: "not-a-uuid", q: 1, price: 1 }] });
    await page.goto("/cart");
    await expect(page.getByText("Keranjangmu masih kosong")).toBeVisible();
    expect(await (await page.request.get("/api/cart")).json()).toEqual({ count: 0 });
  });

  test("shows a cart line with backend-derived state and removes it", async ({ page, context, baseURL }) => {
    const product = await firstActiveProduct();
    test.skip(!product, "No live catalog available");
    await seedCart(context, baseURL!, { v: 1, items: [{ p: product!.id, q: 2 }] });

    const summary = await page.request.get("/api/cart");
    expect(summary.headers()["cache-control"]).toContain("no-store");
    expect(await summary.json()).toEqual({ count: 2 });

    await page.goto("/cart");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: product!.name })).toHaveAttribute("href", `/produk/${product!.slug}`);
    await expect(page.getByRole("link", { name: "Keranjang, 2 produk" })).toBeVisible();

    // Either the quote rejects the line (e.g. out of stock), the quote service is
    // not configured, or a backend total is shown. Never a client-computed total.
    const summaryPanel = main.getByRole("complementary", { name: "Ringkasan Belanja" });
    await expect(
      summaryPanel.getByText(/Total belanja belum dapat dihitung|^Total$/).or(main.getByRole("alert").first()),
    ).toBeVisible();

    await main.getByRole("button", { name: `Hapus ${product!.name} dari keranjang` }).click();
    await expect(page.getByText("Keranjangmu masih kosong")).toBeVisible();
    expect(await (await page.request.get("/api/cart")).json()).toEqual({ count: 0 });
  });

  test("a cart with a line has no WCAG 2.2 AA violations", async ({ page, context, baseURL }) => {
    const product = await firstActiveProduct();
    test.skip(!product, "No live catalog available");
    await seedCart(context, baseURL!, { v: 1, items: [{ p: product!.id, q: 1 }] });
    await page.goto("/cart");
    await expect(page.getByRole("main").getByRole("link", { name: product!.name })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    expect(await page.evaluate(() => window.innerWidth)).toBe(page.viewportSize()?.width);
  });

  test("rejects a malformed coupon code", async ({ page, context, baseURL }) => {
    const product = await firstActiveProduct();
    test.skip(!product, "No live catalog available");
    await seedCart(context, baseURL!, { v: 1, items: [{ p: product!.id, q: 1 }] });
    await page.goto("/cart");
    const input = page.getByLabel("Kode kupon");
    test.skip((await input.count()) === 0, "Coupon form needs a backend quote (service role key)");
    await input.fill("??");
    await page.getByRole("button", { name: "Pakai" }).click();
    await expect(page.getByText("Kode kupon tidak valid.")).toBeVisible();
  });

  test("sold-out products cannot be added from the product page", async ({ page }) => {
    const product = await firstActiveProduct();
    test.skip(!product, "No live catalog available");
    await page.goto(`/produk/${product!.slug}`);
    const main = page.getByRole("main");
    const soldOut = (await main.getByText(/^(Tersedia|Stok habis)$/).first().textContent()) === "Stok habis";
    test.skip(!soldOut, "Product is in stock");
    await expect(main.getByRole("button", { name: "Stok habis" }).first()).toBeDisabled();
  });
});
