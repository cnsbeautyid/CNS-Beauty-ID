import { expect, test } from "@playwright/test";

test.describe("AI Beauty Concierge shell", () => {
  test("launcher opens the concierge with quick actions and a focused input", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();

    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("textbox", { name: "Tulis pertanyaan untuk CNS Beauty AI" })).toBeFocused();
    await expect(panel.getByRole("list", { name: "Pertanyaan cepat" }).getByRole("button")).toHaveCount(6);
    // The launcher hides while the panel is open.
    await expect(page.getByRole("button", { name: "Tanya Beauty AI" })).toBeHidden();
  });

  test("sending a message gives an honest fallback with a human handoff", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    const send = panel.getByRole("button", { name: "Kirim pesan" });

    await expect(send).toBeDisabled();
    await panel.getByRole("button", { name: "Produk untuk kulit kusam" }).click();
    await expect(panel.getByRole("textbox")).toHaveValue("Produk apa yang cocok untuk kulit kusam?");
    await send.click();

    const log = panel.getByRole("log");
    await expect(log).toContainText("Produk apa yang cocok untuk kulit kusam?");
    await expect(log).toContainText("belum dapat menjawab");
    await expect(log.getByRole("link", { name: "Hubungi tim CNS Beauty" })).toHaveAttribute("href", "/kontak");
    await expect(panel.getByRole("textbox")).toHaveValue("");
  });

  test("Escape closes the concierge and returns focus to the launcher", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.getByRole("button", { name: "Tanya Beauty AI" })).toBeFocused();
  });

  test("header Beauty AI button opens the same concierge", async ({ page, isMobile }) => {
    test.skip(isMobile, "Header button is desktop-only; mobile uses the menu entry");
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Beauty AI" }).click();
    await expect(page.getByRole("dialog", { name: "CNS Beauty AI" })).toBeVisible();
  });

  test("mobile menu entry opens the concierge full screen", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile flow");
    await page.goto("/");
    await page.getByRole("button", { name: "Buka menu" }).click();
    await page.getByRole("button", { name: "Tanya CNS Beauty AI" }).click();

    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
  });
});
