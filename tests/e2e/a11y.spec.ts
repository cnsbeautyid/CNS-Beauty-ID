import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary).toEqual([]);
}

test.describe("Accessibility (axe, WCAG 2.2 AA)", () => {
  // Scroll-reveal sections start transparent; measure their final state.
  test.use({ reducedMotion: "reduce" });

  test("home page", async ({ page }) => {
    await page.goto("/");
    await expectNoViolations(page);
  });

  for (const path of [
    "/tentang-kami",
    "/manfaat",
    "/testimoni",
    "/produk",
    "/produk?q=zzqqxx",
    "/produk/licorice-moisturizer-skin-glow",
    "/cart",
    "/masuk",
    "/daftar",
    "/reseller",
  ]) {
    test(`brand page ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  test("design-system page", async ({ page }) => {
    await page.goto("/design-system");
    await expectNoViolations(page);
  });

  test("404 page", async ({ page }) => {
    await page.goto("/halaman-yang-tidak-ada");
    await expectNoViolations(page);
  });

  test("with the AI concierge open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel).toBeVisible();
    // Wait for the enter transition; mid-fade opacity lowers measured contrast.
    await expect(panel).toHaveCSS("opacity", "1");
    await expectNoViolations(page);
  });
});
