import { expect, test, type Page } from "@playwright/test";

// Live public catalog. Opens the first product from /produk rather than a
// hard-coded slug, so the test survives catalog changes.
async function openFirstProduct(page: Page) {
  await page.goto("/produk");
  await expect(page.getByText(/^\d+ produk$/)).toBeVisible();
  const card = page.getByRole("main").getByRole("article").first();
  test.skip((await card.count()) === 0, "Catalog is empty");
  const link = card.getByRole("link").first();
  const name = (await link.textContent())?.trim() ?? "";
  const href = (await link.getAttribute("href")) ?? "";
  await page.goto(href);
  return { name, href };
}

test.describe("Product detail", () => {
  test("shows the product with price, availability and purchase options", async ({ page }) => {
    const { name } = await openFirstProduct(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByText(name)).toHaveAttribute("aria-current", "page");

    const main = page.getByRole("main");
    await expect(main.getByText(/Rp\s?\d{1,3}(\.\d{3})+/).first()).toBeVisible();
    await expect(main.getByText(/^(Tersedia|Stok habis)$/).first()).toBeVisible();
    // The online cart arrives in Phase 6; the button is honestly disabled.
    await expect(main.getByRole("button", { name: /Tambah ke Keranjang|Stok habis/ }).first()).toBeDisabled();
  });

  test("emits Product and Breadcrumb structured data with backend price", async ({ page }) => {
    const { name, href } = await openFirstProduct(page);
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) => JSON.parse(text));
    const product = blocks.find((block) => block["@type"] === "Product");
    expect(product).toMatchObject({ name, offers: { "@type": "Offer", priceCurrency: "IDR" } });
    expect(product.offers.price).toBeGreaterThan(0);
    expect(product.offers.url).toContain(href);
    expect(blocks.some((block) => block["@type"] === "BreadcrumbList")).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${href}$`));
  });

  test("hides unapproved claims", async ({ page }) => {
    await openFirstProduct(page);
    const text = (await page.getByRole("main").innerText()).toLowerCase();
    // Examples of unverified claims present in the live data (master prompt §17).
    for (const claim of ["ibu hamil", "anti-aging", "semua jenis kulit", "skin regeneration"]) {
      expect(text).not.toContain(claim);
    }
    await expect(page.getByRole("heading", { name: "Manfaat", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pertanyaan Umum" })).toHaveCount(0);
  });

  test("the concierge receives the product as page context", async ({ page }) => {
    const { name } = await openFirstProduct(page);
    await page.getByRole("button", { name: "Tanya Beauty AI tentang produk ini" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel.getByText("Kamu sedang melihat")).toContainText(name);
    await expect(panel.getByRole("textbox")).toHaveValue(`Apakah ${name} cocok untuk kulit saya?`);
  });

  test("category links lead back to filtered catalog views", async ({ page }) => {
    await openFirstProduct(page);
    const section = page.getByRole("region", { name: "Temukan Produk Serupa" });
    test.skip((await section.count()) === 0, "No taxonomy mapped");
    for (const link of await section.getByRole("link").all()) {
      await expect(link).toHaveAttribute("href", /^\/produk\?(kebutuhan|kulit)=[a-z0-9-]+$/);
    }
  });

  test("reviews show an empty state until moderated reviews exist", async ({ page }) => {
    await openFirstProduct(page);
    const reviews = page.getByRole("region", { name: "Ulasan" });
    await expect(reviews).toBeVisible();
    const hasReviews = (await reviews.getByRole("listitem").count()) > 0;
    if (!hasReviews) await expect(reviews.getByText("Belum ada ulasan")).toBeVisible();
  });

  test("mobile shows a sticky bar that does not cover the AI launcher", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile layout");
    await openFirstProduct(page);
    const bar = await page.locator("[data-sticky-commerce]").boundingBox();
    const launcher = await page.getByRole("button", { name: "Tanya Beauty AI", exact: true }).boundingBox();
    expect(bar).not.toBeNull();
    expect(launcher).not.toBeNull();
    expect(launcher!.y + launcher!.height).toBeLessThanOrEqual(bar!.y);
  });

  test("unknown products return 404", async ({ page }) => {
    const response = await page.goto("/produk/produk-yang-tidak-ada");
    expect(response?.status()).toBe(404);
  });
});
