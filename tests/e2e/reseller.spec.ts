import { expect, test } from "@playwright/test";

// Signed-out behaviour only; the suite never signs in to the live Supabase
// Auth. Partner access (partner_accounts, wholesale_prices RLS) is covered by
// integration tests and the RLS checks.

test.describe("Partner programme page", () => {
  test("explains the programme without public partner prices", async ({ page }) => {
    await page.goto("/reseller");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jadi Partner CNS Beauty");
    await expect(page.getByRole("heading", { name: "Pilih jenis kemitraan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reseller", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dropshipper", exact: true })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText(/Rp\s?\d/);
    await expect(page.getByRole("main")).not.toContainText(/komisi/i);
  });

  test("asks guests to sign in before applying", async ({ page }) => {
    await page.goto("/reseller");
    await page.getByRole("link", { name: "Daftar sekarang" }).click();
    await expect(page).toHaveURL(/#daftar$/);
    const apply = page.locator("#daftar");
    await expect(apply.getByRole("textbox")).toHaveCount(0);
    await apply.getByRole("link", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/masuk\?next=%2Freseller$/);
  });

  test("is linked from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Jadi Reseller" }).click();
    await expect(page).toHaveURL(/\/reseller$/);
  });
});

test.describe("Partner portal requires login", () => {
  for (const path of ["/reseller-portal", "/reseller-portal/products", "/reseller-portal/orders", "/reseller-portal/ai"]) {
    test(`${path} redirects to sign in and back`, async ({ page }) => {
      const response = await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/masuk\\?next=${encodeURIComponent(path)}$`));
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Masuk");
    });
  }
});
