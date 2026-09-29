import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hero has the brand headline, copy and calls to action", async ({ page }) => {
    const hero = page.getByRole("region", { name: "Kulit Sehat, Lebih Percaya Diri" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kulit Sehat,Lebih Percaya Diri");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(hero.getByRole("link", { name: "Jelajahi Produk" })).toHaveAttribute("href", "/produk");
    await expect(hero.getByRole("link", { name: "Tentang Kami" })).toHaveAttribute("href", "/tentang-kami");
    await expect(hero.getByRole("button", { name: "Tanya CNS Beauty AI" })).toBeVisible();
  });

  test("sections appear in the brief's order", async ({ page }) => {
    const headings = await page.locator("main h2").allTextContents();
    expect(headings).toEqual([
      "Ritual kecil untuk mencintai diri sendiri",
      "Temukan Ritual Skincare yang Tepat untukmu",
      "Cerita Kami",
      "Mulai Ritual Cantikmu Hari Ini",
    ]);
  });

  test("shows no invented products, reviews, articles or concerns", async ({ page }) => {
    // These sections render only from real, approved data (none exists yet).
    for (const name of ["Produk Unggulan", "Cerita dari pelanggan kami", "Edukasi & Ritual Kecantikan", "Apa yang ingin kamu rawat?"]) {
      await expect(page.getByRole("heading", { name })).toHaveCount(0);
    }
    await expect(page.locator("main").getByText(/Rp\s?\d/)).toHaveCount(0);
  });

  test("founder story quotes Wina Ranesa", async ({ page }) => {
    const founder = page.getByRole("region", { name: "Cerita Kami" });
    await expect(founder.getByRole("blockquote")).toContainText("Cantik adalah tentang bagaimana kita melihat");
    await expect(founder).toContainText("Wina Ranesa");
    await expect(founder).toContainText("Founder & Owner CNS Beauty");
    await expect(founder.getByRole("link", { name: "Kenali CNS Beauty" })).toHaveAttribute("href", "/tentang-kami");
  });

  test("AI section chips open the concierge with the question pre-filled", async ({ page }) => {
    const aiSection = page.getByRole("region", { name: "Temukan Ritual Skincare yang Tepat untukmu" });
    await aiSection.getByRole("button", { name: "Buat skincare routine" }).click();

    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel).toBeVisible();
    // Pre-filled, not sent: the customer stays in control.
    await expect(panel.getByRole("textbox")).toHaveValue("Buatkan skincare routine untuk saya.");
    await expect(panel.getByRole("log")).not.toContainText("Buatkan skincare routine untuk saya.");
  });

  test("hero AI button opens the concierge", async ({ page }) => {
    const hero = page.getByRole("region", { name: "Kulit Sehat, Lebih Percaya Diri" });
    await hero.getByRole("button", { name: "Tanya CNS Beauty AI" }).click();
    await expect(page.getByRole("dialog", { name: "CNS Beauty AI" })).toBeVisible();
  });

  test("closing call to action links to products and the concierge", async ({ page }) => {
    const closing = page.getByRole("region", { name: "Mulai Ritual Cantikmu Hari Ini" });
    await expect(closing.getByRole("link", { name: "Jelajahi Produk" })).toHaveAttribute("href", "/produk");
    await closing.getByRole("button", { name: "Tanya CNS Beauty AI" }).click();
    await expect(page.getByRole("dialog", { name: "CNS Beauty AI" })).toBeVisible();
  });

  test("page has a descriptive title", async ({ page }) => {
    await expect(page).toHaveTitle("CNS Beauty Skincare — Kulit Sehat, Lebih Percaya Diri");
  });
});
