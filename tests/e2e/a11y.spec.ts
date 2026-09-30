import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Phase 21 accessibility guards: an axe sweep of every public page, plus the
// behaviours axe can't see (skip-link focus, focus not obscured by the sticky
// header, reflow at 320px).
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PUBLIC_PAGES = [
  "/", "/produk", "CATEGORY", "PRODUCT", "/tentang-kami", "/manfaat", "/testimoni", "/beauty-concierge",
  "/skin-quiz", "/faq", "/kontak", "/kebijakan-privasi", "/reseller", "/cart", "/checkout", "/masuk", "/daftar",
];

async function resolvePath(page: Page, path: string): Promise<string> {
  if (path !== "CATEGORY" && path !== "PRODUCT") return path;
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const pattern = path === "CATEGORY" ? /<loc>https?:\/\/[^<]+(\/produk\/kategori\/[a-z0-9-]+)<\/loc>/ : /<loc>https?:\/\/[^<]+(\/produk\/(?!kategori)[a-z0-9-]+)<\/loc>/;
  const found = sitemap.match(pattern)?.[1];
  expect(found, `${path} in sitemap`).toBeTruthy();
  return found!;
}

/** Waits for redirects (e.g. /checkout → sign-in) and streamed content to settle. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  // loading.tsx skeletons are <main aria-busy="true">; the streamed page replaces them.
  await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
}

async function open(page: Page, path: string): Promise<void> {
  await page.goto(await resolvePath(page, path));
  await settle(page);
}

async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("Accessibility sweep (WCAG 2.2 AA)", () => {
  test.use({ reducedMotion: "reduce" });

  for (const path of PUBLIC_PAGES) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await open(page, path);
      expect(await axeViolations(page)).toEqual([]);
    });
  }

  test("open overlays have no axe violations", async ({ page, isMobile }) => {
    await open(page, "/");
    if (isMobile) await page.getByRole("button", { name: "Buka menu" }).click();
    else await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe("Keyboard", () => {
  test("the skip link moves focus to the main content", async ({ page }) => {
    await open(page, "/produk");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Langsung ke konten utama" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
  });

  for (const path of ["PRODUCT", "/produk"]) {
    test(`focus on ${path} is never hidden under the sticky header`, async ({ page }) => {
      await open(page, path);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.locator("header").first().locator("a:visible, button:visible").last().focus();
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused, "focus moved on").toBeAttached();
      expect(await focused.evaluate((element) => Boolean(element.closest("main"))), "first Tab after the header lands in <main>").toBe(true);
      const header = (await page.locator("header").first().boundingBox())!;
      const top = (await focused.boundingBox())!.y;
      expect(top, "focused element is below the sticky header").toBeGreaterThanOrEqual(header.y + header.height - 1);
    });
  }
});

test.describe("Reflow at 320px (1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of PUBLIC_PAGES) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await open(page, path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
  }
});
