import { expect, test } from "@playwright/test";

// Signed-out paths and client-side validation only: the suite never creates
// accounts or sends credentials to the live Supabase Auth.

test.describe("Checkout requires login", () => {
  test("signed-out visitors are sent to sign in and back to checkout", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/masuk\?next=%2Fcheckout$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Masuk");
    await expect(page.getByText("Masuk untuk melanjutkan checkout.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Daftar sekarang" })).toHaveAttribute("href", "/daftar?next=%2Fcheckout");
  });

  test("order pages require login and reject malformed numbers", async ({ page }) => {
    await page.goto("/account/orders/CNS-260930-00001");
    await expect(page).toHaveURL(/\/masuk\?next=%2Faccount%2Forders%2FCNS-260930-00001$/);

    const response = await page.goto("/account/orders/%3Cscript%3E");
    expect(response?.status()).toBe(404);
  });

  test("an off-site next parameter is ignored", async ({ page }) => {
    await page.goto("/masuk?next=https://evil.test/phish");
    await expect(page.getByRole("link", { name: "Daftar sekarang" })).toHaveAttribute("href", "/daftar?next=%2F");
  });

  test("a failed confirmation link explains what happened", async ({ page }) => {
    await page.goto("/auth/callback?next=/checkout");
    await expect(page).toHaveURL(/\/masuk\?error=link&next=%2Fcheckout$/);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Tautan konfirmasi tidak valid");
  });

  test("the expiry cron is not publicly callable", async ({ request }) => {
    const anonymous = await request.get("/api/cron/expire-orders");
    expect([401, 503]).toContain(anonymous.status());
    const forged = await request.get("/api/cron/expire-orders", { headers: { Authorization: "Bearer guess" } });
    expect([401, 503]).toContain(forged.status());
  });
});

test.describe("Auth forms validate before submitting", () => {
  test("sign-in shows field errors", async ({ page }) => {
    await page.goto("/masuk");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByText("Masukkan email yang valid.")).toBeVisible();
    await expect(page.getByText("Masukkan kata sandi.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("sign-up enforces the password length", async ({ page }) => {
    await page.goto("/daftar");
    await page.getByLabel("Nama lengkap").fill("Sari Dewi");
    await page.getByLabel("Email").fill("sari@example.test");
    await page.getByLabel("Kata sandi").fill("short");
    await page.getByRole("button", { name: "Daftar", exact: true }).click();
    await expect(page.getByText("Kata sandi minimal 8 karakter.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });
});
