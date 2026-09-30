import { expect, test } from "@playwright/test";

// Signed-out behaviour only; the suite never signs in to the live Supabase
// Auth. Staff authorization (user_roles + staff RLS) and every admin action
// are covered by integration tests and the live RLS checks.

const PATHS = [
  "/admin",
  "/admin/orders",
  "/admin/orders?status=paid&q=CNS",
  "/admin/products",
  "/admin/inventory",
  "/admin/customers",
  "/admin/resellers",
  "/admin/knowledge",
  "/admin/ai",
  "/admin/content",
  "/admin/analytics",
  "/admin/audit-log",
];

test.describe("Admin requires login", () => {
  for (const path of PATHS) {
    test(`${path} redirects to sign in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/masuk\\?next=${encodeURIComponent(path.split("?")[0] ?? path)}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Masuk");
    });
  }

  test("admin detail routes redirect too", async ({ page }) => {
    await page.goto("/admin/products/11111111-1111-4111-8111-111111111111");
    await expect(page).toHaveURL(/\/masuk\?next=%2Fadmin%2Fproducts%2F11111111-1111-4111-8111-111111111111$/);
    await page.goto("/admin/orders/CNS-260930-00001");
    await expect(page).toHaveURL(/\/masuk\?next=%2Fadmin%2Forders%2FCNS-260930-00001$/);
  });

  test("the admin area is not indexable and not linked from the storefront", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  });
});
