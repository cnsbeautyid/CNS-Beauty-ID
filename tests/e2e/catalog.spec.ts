import { expect, test, type Page } from "@playwright/test";

// Runs against the live, public CNS catalog (RLS: active products only).
// Assertions are invariants, not specific products, so they survive
// catalog changes.

const cards = (page: Page) => page.getByRole("main").getByRole("article");

/** Results stream in after the loading skeleton; wait for the count line. */
async function waitForResults(page: Page) {
  await expect(page.getByText(/^\d+ produk$/)).toBeVisible();
}

test.describe("Catalog /produk", () => {
  test("lists active products with backend prices and product links", async ({ page }) => {
    await page.goto("/produk");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Semua Produk");
    await waitForResults(page);

    const count = await cards(page).count();
    test.skip(count === 0, "Catalog is empty");
    for (const card of await cards(page).all()) {
      await expect(card.getByRole("link").first()).toHaveAttribute("href", /^\/produk\/[a-z0-9-]+$/);
      await expect(card).toContainText(/Rp\s?\d{1,3}(\.\d{3})*/);
    }
  });

  test("concern filter narrows results and can be cleared", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop sidebar; mobile drawer covered below");
    await page.goto("/produk");
    await waitForResults(page);
    const total = await cards(page).count();

    const filter = page.getByRole("complementary", { name: "Filter produk" }).getByRole("group", { name: "Kebutuhan kulit" });
    const option = filter.getByRole("link").first();
    const label = (await option.textContent())?.trim() ?? "";
    await option.click();

    await expect(page).toHaveURL(/kebutuhan=/);
    await waitForResults(page);
    await expect(filter.getByRole("link", { name: label })).toHaveAttribute("aria-current", "true");
    expect(await cards(page).count()).toBeLessThanOrEqual(total);

    await page.getByRole("link", { name: "Hapus semua" }).click();
    await expect(page).toHaveURL(/\/produk$/);
  });

  test("search with no match shows an empty state", async ({ page }) => {
    await page.goto("/produk");
    await page.getByRole("searchbox", { name: "Cari produk" }).fill("zzqqxx-tidak-ada");
    await page.getByRole("button", { name: "Cari", exact: true }).click();
    await expect(page).toHaveURL(/q=zzqqxx-tidak-ada/);
    await expect(page.getByText("Produk tidak ditemukan")).toBeVisible();
    await expect(page.getByRole("link", { name: "Hapus filter", exact: true })).toHaveAttribute("href", "/produk");
  });

  test("sorting by price orders cards by price", async ({ page }) => {
    await page.goto("/produk?urut=price-asc");
    await waitForResults(page);
    const prices = (await cards(page).allTextContents()).map((text) =>
      Number(text.match(/Rp\s?([\d.]+)/)?.[1]?.replace(/\./g, "") ?? Number.NaN),
    );
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    await expect(page.getByRole("combobox", { name: "Urutkan" })).toHaveValue("price-asc");
  });

  test("tampered parameters are ignored", async ({ page }) => {
    const response = await page.goto("/produk?urut=hack&halaman=-5&kebutuhan=DROP%20TABLE");
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/^\d+ produk$/)).toBeVisible();
  });

  test("filtered views are not indexed; the base listing is", async ({ page }) => {
    await page.goto("/produk?q=serum");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/produk");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/produk$/);
  });

  test("mobile filters open in a drawer", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile flow");
    await page.goto("/produk");
    await page.getByRole("button", { name: /^Filter/ }).click();
    const drawer = page.getByRole("dialog", { name: "Filter produk" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("group", { name: "Jenis kulit" })).toBeVisible();
  });
});

test.describe("Category pages", () => {
  test("category chips link to category listings", async ({ page }) => {
    await page.goto("/produk");
    const nav = page.getByRole("navigation", { name: "Kategori produk" });
    await expect(nav.getByRole("link", { name: "Semua" })).toHaveAttribute("aria-current", "page");
    const first = nav.getByRole("link").nth(1);
    const name = (await first.textContent())?.trim() ?? "";
    await first.click();
    await expect(page).toHaveURL(/\/produk\/kategori\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  });

  test("unknown categories return 404", async ({ page }) => {
    const response = await page.goto("/produk/kategori/kategori-yang-tidak-ada");
    expect(response?.status()).toBe(404);
  });
});
