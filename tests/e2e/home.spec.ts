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
    const order = [
      "Ritual kecil untuk mencintai diri sendiri",
      "Apa yang ingin kamu rawat?",
      "Produk Unggulan",
      "Temukan Ritual Skincare yang Tepat untukmu",
      "Cerita Kami",
      "Cerita dari pelanggan kami",
      "Edukasi & Ritual Kecantikan",
      "Mulai Ritual Cantikmu Hari Ini",
    ];
    // Data-driven sections may be absent; the ones present must keep this order.
    const headings = await page.locator("main h2").allTextContents();
    expect(headings).toEqual(order.filter((heading) => headings.includes(heading)));
    for (const always of [order[0], order[3], order[4], order[7]]) expect(headings).toContain(always);
  });

  test("data-driven sections show only catalog data", async ({ page }) => {
    // No published reviews or articles exist yet, so these stay hidden.
    for (const name of ["Cerita dari pelanggan kami", "Edukasi & Ritual Kecantikan"]) {
      await expect(page.getByRole("heading", { name })).toHaveCount(0);
    }
    const featured = page.getByRole("region", { name: "Produk Unggulan" });
    for (const card of await featured.getByRole("article").all()) {
      await expect(card.getByRole("link").first()).toHaveAttribute("href", /^\/produk\/[a-z0-9-]+$/);
    }
    const concerns = page.getByRole("region", { name: "Apa yang ingin kamu rawat?" });
    for (const link of await concerns.getByRole("link").all()) {
      await expect(link).toHaveAttribute("href", /^\/produk\?kebutuhan=[a-z0-9-]+$/);
    }
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
