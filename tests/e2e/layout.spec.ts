import { expect, test } from "@playwright/test";

test.describe("Site header", () => {
  test("desktop shows primary navigation with the current page marked", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop navigation");
    await page.goto("/");
    const nav = page.getByRole("banner").getByRole("navigation", { name: "Navigasi utama" });
    await expect(nav.getByRole("link")).toHaveText([
      "Beranda",
      "Produk",
      "Tentang Kami",
      "Manfaat",
      "Testimoni",
      "Artikel",
      "Kontak",
    ]);
    await expect(nav.getByRole("link", { name: "Beranda" })).toHaveAttribute("aria-current", "page");

    const banner = page.getByRole("banner");
    for (const name of ["Cari produk", "Wishlist", "Akun saya", "Keranjang"]) {
      await expect(banner.getByRole("link", { name })).toBeVisible();
    }
    await expect(banner.getByRole("button", { name: "Beauty AI" })).toBeVisible();
  });

  test("mobile shows only menu, logo and cart", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile header");
    await page.goto("/");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("button", { name: "Buka menu" })).toBeVisible();
    await expect(banner.getByRole("link", { name: /ke beranda/ })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Keranjang" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Wishlist" })).toBeHidden();
    await expect(banner.getByRole("button", { name: "Beauty AI" })).toBeHidden();
  });

  test("mobile menu drawer opens, closes with Escape and restores focus", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile drawer");
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Buka menu" });
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Produk", exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("footer lists shop, brand and help links", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("navigation", { name: "Belanja" })).toBeVisible();
    await expect(footer.getByRole("navigation", { name: "CNS Beauty" })).toBeVisible();
    await expect(footer.getByRole("navigation", { name: "Bantuan" })).toBeVisible();
  });
});

test.describe("Responsive layout", () => {
  for (const path of ["/", "/tentang-kami", "/manfaat", "/testimoni", "/produk", "/design-system"]) {
    test(`${path} fits the device width without zooming out`, async ({ page }) => {
      await page.goto(path);
      const viewportWidth = page.viewportSize()?.width;
      // A too-wide element makes mobile browsers widen the layout viewport,
      // which scrollWidth checks alone do not catch.
      const layoutWidth = await page.evaluate(() => window.innerWidth);
      expect(layoutWidth).toBe(viewportWidth);
    });
  }
});

test.describe("Design-system overlays", () => {
  test("modal traps focus, closes on Escape and returns focus", async ({ page }) => {
    await page.goto("/design-system");
    const trigger = page.getByRole("button", { name: "Buka modal" });
    await trigger.click();

    const modal = page.getByRole("dialog", { name: "Contoh modal" });
    await expect(modal).toBeVisible();

    // The page behind a native modal dialog is inert. Tab may move focus to
    // browser UI (activeElement = body) but must never reach page content.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const location = await modal.evaluate((el) => {
        const active = document.activeElement;
        if (!active || active === document.body) return "browser";
        return el.contains(active) ? "modal" : "page";
      });
      expect(location).not.toBe("page");
    }

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("product cards link to Indonesian product URLs", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByRole("link", { name: "Produk Contoh A" }).first()).toHaveAttribute("href", "/produk/produk-contoh-a");
    await expect(page.getByText("Belum ada produk")).toBeVisible();
  });
});
