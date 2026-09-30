import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Runs against the live public catalog. Without the service-role key the
// server doesn't write profiles or recommendation logs, so this is read-only.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function answerQuiz(page: Page) {
  const next = page.getByRole("button", { name: "Lanjut" });
  await page.goto("/skin-quiz");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kenali Kulitmu");

  await expect(next).toBeDisabled();
  await page.getByLabel("Kering", { exact: true }).check();
  await next.click();

  await expect(page.getByRole("heading", { name: "Apa kebutuhan utama kulitmu?" })).toBeFocused();
  await page.getByLabel("Kulit Kusam").check();
  await next.click();

  await page.getByLabel("Kadang sensitif").check();
  await next.click();
  await next.click(); // no current routine
  await next.click(); // no goals
  await page.getByLabel("Tidak ada batas").check();
  await page.getByRole("button", { name: "Lihat hasil" }).click();
  await expect(page.getByRole("heading", { name: "Profil kulitmu" })).toBeVisible();
}

test.describe("Skin Quiz", () => {
  test.use({ reducedMotion: "reduce" });

  test("recommends catalog products with a routine and honest guidance", async ({ page }) => {
    await answerQuiz(page);
    const main = page.getByRole("main");
    await expect(main.getByText("Kering", { exact: true })).toBeVisible();
    await expect(main.getByText("Kulit Kusam", { exact: true })).toBeVisible();
    await expect(main).toContainText("patch test");

    const products = main.getByRole("heading", { name: "Produk yang direkomendasikan" });
    await expect(products).toBeVisible();
    const cards = main.getByRole("article");
    const count = await cards.count();
    test.skip(count === 0, "No catalog product matches this concern");

    // Reasons cite catalog categories only, never "suitable/safe for" claims.
    await expect(main.getByText(/^Termasuk kebutuhan: .*Kulit Kusam/).first()).toBeVisible();
    const text = (await main.innerText()).toLowerCase();
    for (const claim of ["aman untuk", "cocok untuk semua", "ibu hamil", "anti-aging"]) expect(text).not.toContain(claim);

    await expect(main.getByRole("heading", { name: "Rutinitas yang disarankan" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Pagi" })).toBeVisible();
    // Stock comes from the backend: sold-out routines can't be added.
    const add = main.getByRole("button", { name: /rutinitas ke keranjang|sedang tidak tersedia/ });
    if ((await add.textContent())?.includes("tidak tersedia")) await expect(add).toBeDisabled();
    else await expect(add).toBeEnabled();
  });

  test("guests are asked to sign in to save, and the result survives the round-trip", async ({ page }) => {
    await answerQuiz(page);
    await page.getByRole("button", { name: "Simpan profil kulit" }).click();
    await expect(page).toHaveURL(/\/masuk\?next=%2Fskin-quiz$/);
    await page.goto("/skin-quiz");
    await expect(page.getByRole("heading", { name: "Profil kulitmu" })).toBeVisible();
    await page.getByRole("button", { name: "Ulangi quiz" }).click();
    await expect(page.getByRole("heading", { name: "Apa jenis kulitmu?" })).toBeVisible();
  });

  test("limits concerns to three", async ({ page }) => {
    await page.goto("/skin-quiz");
    await page.getByLabel("Normal", { exact: true }).check();
    await page.getByRole("button", { name: "Lanjut" }).click();
    const boxes = page.getByRole("main").getByRole("checkbox");
    for (let index = 0; index < 3; index++) await boxes.nth(index).check();
    await expect(boxes.nth(3)).toBeDisabled();
  });

  test("quiz and results have no WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/skin-quiz");
    await expect(page.getByRole("heading", { name: "Apa jenis kulitmu?" })).toBeVisible();
    await expectNoViolations(page);
    await answerQuiz(page);
    await expectNoViolations(page);
    expect(await page.evaluate(() => window.innerWidth)).toBe(page.viewportSize()?.width);
  });

  test("the skin profile and routine pages require login", async ({ page }) => {
    await page.goto("/account/skin-profile");
    await expect(page).toHaveURL(/\/masuk\?next=%2Faccount%2Fskin-profile$/);
    await page.goto("/account/routine");
    await expect(page).toHaveURL(/\/masuk\?next=%2Faccount%2Froutine$/);
  });

  test("saving the quiz routine asks guests to sign in", async ({ page }) => {
    await answerQuiz(page);
    const save = page.getByRole("button", { name: "Simpan sebagai rutinitas saya" });
    test.skip((await save.count()) === 0, "No products matched, so there is no routine to save");
    await save.click();
    await expect(page).toHaveURL(/\/masuk\?next=%2Fskin-quiz$/);
  });
});
