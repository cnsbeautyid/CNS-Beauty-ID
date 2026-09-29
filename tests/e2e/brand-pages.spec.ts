import { expect, test } from "@playwright/test";

test.describe("About (Tentang Kami)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tentang-kami");
  });

  test("has the brand heading, founder story and values", async ({ page }) => {
    await expect(page).toHaveTitle("Tentang Kami | CNS Beauty");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("CNS Beauty Skincare");
    await expect(page.getByText("Ritual Cantik untuk Diri Sendiri")).toBeVisible();

    const founder = page.getByRole("region", { name: "Cerita Kami" });
    await expect(founder.getByRole("blockquote")).toContainText("Cantik adalah tentang bagaimana kita melihat");
    await expect(founder).toContainText("Wina Ranesa");
    // No self-link back to the About page from its own founder section.
    await expect(founder.getByRole("link", { name: "Kenali CNS Beauty" })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Lebih dari sekadar perawatan kulit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ritual kecil untuk mencintai diri sendiri" })).toBeVisible();
  });

  test("marks Tentang Kami as the current page", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop navigation");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Tentang Kami" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

test.describe("Benefits (Manfaat)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/manfaat");
  });

  test("explains the journey and the three-step routine", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dari kebutuhan kulit ke ritual yang tepat");

    const journey = page.getByRole("region", { name: "Menemukan ritualmu dalam empat langkah" });
    await expect(journey.getByRole("listitem")).toHaveCount(4);

    const routine = page.getByRole("region", { name: "Ritual tiga langkah" });
    await expect(routine.getByRole("heading", { level: 3 })).toHaveText(["Serum", "Moisturizer", "Face Mist"]);
  });

  test("offers AI and Skin Quiz, with a non-medical disclaimer", async ({ page }) => {
    const cta = page.getByRole("region", { name: "Belum yakin harus mulai dari mana?" });
    await expect(cta.getByRole("link", { name: "Ikuti Skin Quiz" })).toHaveAttribute("href", "/skin-quiz");
    await cta.getByRole("button", { name: "Tanya CNS Beauty AI" }).click();
    await expect(page.getByRole("dialog", { name: "CNS Beauty AI" })).toBeVisible();
    await expect(page.getByText("bukan diagnosis atau saran medis")).toBeVisible();
  });

  test("shows no concern mapping or prices without catalog data", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Apa yang ingin kamu rawat?" })).toHaveCount(0);
    await expect(page.locator("main").getByText(/Rp\s?\d/)).toHaveCount(0);
  });
});

test.describe("Testimonials (Testimoni)", () => {
  test("shows an honest empty state and is not indexed while empty", async ({ page }) => {
    await page.goto("/testimoni");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cerita dari Pelanggan");
    await expect(page.getByText("Testimoni segera hadir")).toBeVisible();
    await expect(page.getByText("ulasan asli")).toBeVisible();
    await expect(page.getByRole("main").getByRole("blockquote")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
