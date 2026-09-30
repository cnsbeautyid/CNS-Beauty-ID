import { expect, test } from "@playwright/test";

// Signed-out behaviour only; the suite never signs in to the live Supabase
// Auth. Signed-in flows are covered by integration tests and RLS checks.

test.describe("Customer account requires login", () => {
  for (const path of ["/account", "/account/orders", "/account/orders?halaman=2", "/account/wishlist", "/account/settings", "/account/loyalty"]) {
    test(`${path} redirects to sign in and back`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/masuk\\?next=${encodeURIComponent(path.split("?")[0] ?? path)}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Masuk");
    });
  }

  test("the header account link leads to the account area", async ({ page }) => {
    await page.goto("/");
    const account = page.getByRole("link", { name: "Akun saya" });
    test.skip(!(await account.isVisible()), "Account icon is desktop-only");
    await account.click();
    await expect(page).toHaveURL(/\/masuk\?next=%2Faccount$/);
  });
});

test.describe("Wishlist for guests", () => {
  test("the API returns nothing for guests and is not cached", async ({ request }) => {
    const response = await request.get("/api/wishlist");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toEqual({ signedIn: false, productIds: [] });
  });

  test("saving from a product page asks the guest to sign in first", async ({ page }) => {
    await page.goto("/produk");
    await expect(page.getByText(/^\d+ produk$/)).toBeVisible();
    const card = page.getByRole("main").getByRole("article").first();
    test.skip((await card.count()) === 0, "Catalog is empty");
    const href = (await card.getByRole("link").first().getAttribute("href")) ?? "/produk";
    await page.goto(href);

    await page.getByRole("button", { name: /Simpan ke wishlist/ }).click();
    await expect(page).toHaveURL(new RegExp(`/masuk\\?next=${encodeURIComponent(href)}$`));
  });
});
