import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Phase 21 accessibility guards: an axe sweep of every public page, plus the
// behaviours axe can't see (skip-link focus, focus not obscured by the sticky
// header, reflow at 320px).
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PUBLIC_PAGES = [
  "/", "/produk", "CATEGORY", "PRODUCT", "/tentang-kami", "/manfaat", "/testimoni", "/beauty-concierge",
  "/skin-quiz", "/faq", "/kontak", "/kebijakan-privasi", "/reseller", "/cart", "/masuk", "/daftar",
  "/produk?q=zzqqxx", "/design-system",
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
  const response = await page.goto(await resolvePath(page, path));
  expect(response?.status() ?? 0, `${path} responds`).toBeLessThan(400);
  await settle(page);
  // Guards must test the real page, not an error boundary or an empty shell.
  await expect(page.locator("h1").first(), `${path} rendered`).toBeVisible();
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

  test("/checkout sends signed-out visitors to sign-in, which has no axe violations", async ({ page }) => {
    await page.goto("/checkout");
    await settle(page);
    await expect(page).toHaveURL(/\/masuk/);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("the 404 page has no axe violations", async ({ page }) => {
    const response = await page.goto("/halaman-yang-tidak-ada");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("open overlays have no axe violations", async ({ page, isMobile }) => {
    await open(page, "/");
    if (isMobile) await page.getByRole("button", { name: "Buka menu" }).click();
    else await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();
    // Wait for the enter transition; mid-fade opacity lowers measured contrast.
    await expect(dialog).toHaveCSS("opacity", "1");
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

  // Every Tab stop inside <main>, forward from the top and backward from the
  // footer, must be fully clear of the sticky header (and, on mobile product
  // pages, of the sticky Add-to-Cart bar). WCAG 2.2 2.4.11.
  for (const path of ["PRODUCT", "/produk"]) {
    for (const direction of ["Tab", "Shift+Tab"] as const) {
      test(`${direction} focus on ${path} is never hidden under sticky bars`, async ({ page }) => {
        await open(page, path);
        if (direction === "Shift+Tab") await page.locator("footer a").last().focus();
        const hidden: string[] = [];
        let checked = 0;
        for (let step = 0; step < 60; step++) {
          await page.keyboard.press(direction);
          const state = await page.evaluate(() => {
            const element = document.activeElement as HTMLElement | null;
            if (!element || !element.closest("main")) return null;
            const box = element.getBoundingClientRect();
            const header = document.querySelector("header")!.getBoundingClientRect();
            const bar = document.querySelector("[data-sticky-commerce]");
            const barTop = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().top : Infinity;
            const label = (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().slice(0, 30);
            return { label, underHeader: box.top < header.bottom - 1, underBar: box.bottom > barTop + 1 && box.height < barTop };
          });
          if (!state) continue;
          checked++;
          if (state.underHeader || state.underBar) hidden.push(`${state.label}${state.underHeader ? " (header)" : ""}${state.underBar ? " (bar)" : ""}`);
        }
        expect(checked, "focus visited elements inside <main>").toBeGreaterThan(3);
        expect(hidden).toEqual([]);
      });
    }
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
