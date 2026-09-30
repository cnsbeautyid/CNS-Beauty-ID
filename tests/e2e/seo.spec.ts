import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("SEO endpoints", () => {
  test("robots.txt blocks everything outside Vercel production", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    // The local production server has no VERCEL_ENV, so it must not be indexable.
    expect(body).toMatch(/Disallow: \/\s*$/m);
  });

  test("sitemap.xml lists public pages and products", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("/kontak</loc>");
    expect(body).toContain("/faq</loc>");
    expect(body).toMatch(/\/produk\/[a-z0-9-]+<\/loc>/);
    expect(body).not.toContain("/account");
    expect(body).not.toContain("/artikel");
  });

  test("the default share image is a PNG", async ({ request }) => {
    const response = await request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("the home page head has canonical, Open Graph, Twitter and organization data", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "CNS Beauty");
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((text) => (JSON.parse(text) as { "@type": string })["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
  });

  test("header and footer never link to pages that don't exist yet", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/artikel"], a[href="/paket"]')).toHaveCount(0);
  });
});

test.describe("FAQ page", () => {
  test("shows approved questions that open from the keyboard, with FAQPage data", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.getByRole("heading", { level: 1, name: "Pertanyaan Umum" })).toBeVisible();
    const first = page.locator("details").first();
    await expect(first).not.toHaveAttribute("open", "");
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map((text) => JSON.parse(text) as { "@type": string; mainEntity?: unknown[] }).find((data) => data["@type"] === "FAQPage");
    expect(faq?.mainEntity?.length).toBe(await page.locator("details").count());
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/faq$/);
  });

  test("has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/faq");
    const results = await new AxeBuilder({ page }).include("main").withTags(AXE_TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test.describe("Contact page", () => {
  test("shows the configured contact channels", async ({ page }) => {
    await page.goto("/kontak");
    await expect(page.getByRole("heading", { level: 1, name: "Kontak" })).toBeVisible();
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/62\d+/);
    await expect(page.getByRole("link", { name: /@/ }).first()).toHaveAttribute("href", /^(mailto:|https:\/\/instagram\.com\/)/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/kontak$/);
  });

  test("has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/kontak");
    const results = await new AxeBuilder({ page }).include("main").withTags(AXE_TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
