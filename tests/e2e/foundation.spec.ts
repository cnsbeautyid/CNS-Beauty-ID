import { expect, test } from "@playwright/test";

test.describe("Phase 0 foundation", () => {
  test("home renders with Indonesian language and brand fonts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();

    const fontFamily = await heading.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain("cormorant");
  });

  test("skip link is the first focusable element", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is verified on desktop");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Langsung ke konten utama" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("security headers are set", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("health endpoint reports status without secrets", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    const body: unknown = await response.json();
    expect(body).toEqual({ status: "ok", supabaseConfigured: expect.any(Boolean) });
  });

  test("unknown routes show the branded 404", async ({ page }) => {
    const response = await page.goto("/halaman-yang-tidak-ada");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kembali ke Beranda" })).toHaveAttribute("href", "/");
  });
});
