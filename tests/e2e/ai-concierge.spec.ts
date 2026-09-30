import AxeBuilder from "@axe-core/playwright";
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

  test("streams a grounded reply with tool status, product cards and a human handoff", async ({ page }) => {
    // Deterministic SSE from the route (never a real, paid model in E2E).
    const events = [
      { type: "meta", conversationId: null },
      { type: "status", label: "Mencari produk yang cocok…" },
      { type: "products", items: [{ slug: "licorice-moisturizer-skin-glow", name: "Licorice Moisturizer", price: 150000, available: false }] },
      { type: "text", delta: "Ini pilihan yang bisa kamu pertimbangkan." },
      { type: "handoff", url: "https://wa.me/6281285356499?text=Halo" },
      { type: "done" },
    ];
    let requestBody: unknown;
    await page.route("**/api/ai/chat", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""),
      });
    });

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
    await expect(log).toContainText("Ini pilihan yang bisa kamu pertimbangkan.");
    const cards = log.getByRole("list", { name: "Rekomendasi produk" });
    await expect(cards.getByRole("link", { name: "Licorice Moisturizer" })).toHaveAttribute("href", "/produk/licorice-moisturizer-skin-glow");
    await expect(cards).toContainText("Rp 150.000");
    await expect(cards).toContainText("Stok habis");
    await expect(log.getByRole("link", { name: /Chat tim CNS Beauty di WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\//);
    await expect(log).toHaveAttribute("aria-busy", "false");
    await expect(panel.getByRole("textbox")).toHaveValue("");
    await expect(panel.getByRole("textbox")).toBeEnabled();

    // Only the visible transcript and page context are sent; never prices or identity.
    expect(requestBody).toEqual({ messages: [{ role: "user", content: "Produk apa yang cocok untuk kulit kusam?" }], pageContext: { pageType: "home" } });

    await panel.getByRole("button", { name: "Mulai percakapan baru" }).click();
    await expect(log).not.toContainText("Ini pilihan yang bisa kamu pertimbangkan.");
  });

  test("a failed request shows an honest error instead of a reply", async ({ page }) => {
    await page.route("**/api/ai/chat", (route) => route.fulfill({ status: 500, body: "" }));
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await panel.getByRole("textbox").fill("Halo");
    await panel.getByRole("button", { name: "Kirim pesan" }).click();
    await expect(panel.getByRole("log")).toContainText("Koneksi ke CNS Beauty AI terputus");
    await expect(panel.getByRole("log").getByRole("link", { name: "Hubungi tim CNS Beauty" })).toHaveAttribute("href", "/kontak");
  });

  test("the concierge panel with a conversation has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.route("**/api/ai/chat", (route) =>
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: [
          { type: "products", items: [{ slug: "serum", name: "Serum", price: 150000, available: true }] },
          { type: "text", delta: "Halo!" },
          { type: "done" },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
      }),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await panel.getByRole("textbox").fill("Halo");
    await panel.getByRole("button", { name: "Kirim pesan" }).click();
    await expect(panel.getByRole("log")).toContainText("Halo!");
    const results = await new AxeBuilder({ page }).include(".cns-ai-panel").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
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
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Tanya CNS Beauty AI" }).click();

    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
  });
});

test.describe("Concierge API", () => {
  const body = { messages: [{ role: "user", content: "Halo" }], pageContext: { pageType: "home" } };

  test("rejects cross-origin and malformed requests", async ({ request, baseURL }) => {
    expect((await request.post("/api/ai/chat", { data: body, headers: { Origin: "https://evil.test" } })).status()).toBe(403);
    expect((await request.post("/api/ai/chat", { data: body })).status()).toBe(403);
    const origin = { Origin: new URL(baseURL!).origin };
    expect((await request.post("/api/ai/chat", { data: { messages: [{ role: "assistant", content: "x" }] }, headers: origin })).status()).toBe(400);
    expect((await request.post("/api/ai/chat", { data: "not json", headers: { ...origin, "Content-Type": "application/json" } })).status()).toBe(400);
  });

  test("without a configured gateway it answers honestly and offers the team", async ({ request, baseURL }) => {
    const response = await request.post("/api/ai/chat", { data: body, headers: { Origin: new URL(baseURL!).origin } });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/event-stream");
    expect(response.headers()["set-cookie"]).toMatch(/cns_aid=[0-9a-f-]{36}; .*HttpOnly/i);
    const text = await response.text();
    test.skip(!text.includes('"type":"unavailable"'), "An LLM gateway is configured; the live model is not called from E2E");
    expect(text).toContain("CNS Beauty AI sedang tidak tersedia");
    expect(text).toContain('"type":"handoff"');
    expect(text.trim().endsWith('data: {"type":"done"}')).toBe(true);
  });
});

const conciergeReply = [
  { type: "meta", conversationId: null },
  { type: "products", items: [{ slug: "licorice-moisturizer-skin-glow", name: "Licorice Moisturizer", price: 150000, available: true }] },
  { type: "text", delta: "Ini pilihan untuk kulit kusam." },
  { type: "done" },
];
const sse = (events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

test.describe("Beauty Concierge page", () => {
  test("streams a reply inline, sends the concierge page context, and hides the launcher", async ({ page }) => {
    let requestBody: unknown;
    await page.route("**/api/ai/chat", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse(conciergeReply) });
    });
    await page.goto("/beauty-concierge");

    await expect(page.getByRole("heading", { level: 1, name: "Beauty Concierge" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tanya Beauty AI" })).toHaveCount(0);

    const chat = page.getByRole("region", { name: "CNS Beauty AI" });
    await chat.getByRole("button", { name: "Produk untuk kulit kusam" }).click();
    await chat.getByRole("button", { name: "Kirim pesan" }).click();

    const log = chat.getByRole("log");
    await expect(log).toContainText("Ini pilihan untuk kulit kusam.");
    await expect(log.getByRole("link", { name: "Licorice Moisturizer" })).toHaveAttribute("href", "/produk/licorice-moisturizer-skin-glow");
    expect(requestBody).toEqual({
      messages: [{ role: "user", content: "Produk apa yang cocok untuk kulit kusam?" }],
      pageContext: { pageType: "concierge" },
    });
  });

  test("does not focus the input on load", async ({ page }) => {
    await page.goto("/beauty-concierge");
    const input = page.getByRole("region", { name: "CNS Beauty AI" }).getByRole("textbox");
    await expect(input).toBeVisible();
    await expect(input).not.toBeFocused();
  });

  test("keeps the conversation across a reload and continues a panel conversation", async ({ page }) => {
    await page.route("**/api/ai/chat", (route) =>
      route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse(conciergeReply) }),
    );
    // Start in the floating panel on the homepage.
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await panel.getByRole("textbox").fill("Kulit saya kusam");
    await panel.getByRole("button", { name: "Kirim pesan" }).click();
    await expect(panel.getByRole("log")).toContainText("Ini pilihan untuk kulit kusam.");

    // Continue on the full page.
    await page.goto("/beauty-concierge");
    const chat = page.getByRole("region", { name: "CNS Beauty AI" });
    const log = chat.getByRole("log");
    await expect(log).toContainText("Kulit saya kusam");
    await expect(log).toContainText("Ini pilihan untuk kulit kusam.");

    await page.reload();
    await expect(log).toContainText("Ini pilihan untuk kulit kusam.");

    // New conversation clears it, including after another reload.
    await chat.getByRole("button", { name: "Mulai percakapan baru" }).click();
    await page.reload();
    await expect(chat.getByRole("list", { name: "Pertanyaan cepat" })).toBeVisible();
    await expect(log).not.toContainText("Kulit saya kusam");
  });

  test("a rail prompt pre-fills and focuses the input", async ({ page, isMobile }) => {
    await page.goto("/beauty-concierge");
    const rail = page.getByRole("complementary", { name: "Profil kecantikanmu" });
    if (isMobile) await rail.locator("summary").click();
    await rail.getByRole("button", { name: "Buat skincare routine" }).click();
    const input = page.getByRole("region", { name: "CNS Beauty AI" }).getByRole("textbox");
    await expect(input).toHaveValue("Buatkan skincare routine untuk saya.");
    await expect(input).toBeFocused();
  });

  test("mobile: the rail is collapsed and nothing scrolls sideways", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile layout");
    await page.goto("/beauty-concierge");
    const rail = page.getByRole("complementary", { name: "Profil kecantikanmu" });
    await expect(rail.locator("summary")).toHaveText("Kenali kulitmu");
    await expect(rail.getByRole("link", { name: "Mulai Skin Quiz" })).toHaveCount(0);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("desktop: rail beside the chat", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop layout");
    await page.goto("/beauty-concierge");
    const rail = page.getByRole("complementary", { name: "Profil kecantikanmu" });
    await expect(rail.getByRole("link", { name: "Mulai Skin Quiz" })).toBeVisible();
    const railBox = await rail.boundingBox();
    const chatBox = await page.getByRole("region", { name: "CNS Beauty AI" }).boundingBox();
    expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(chatBox!.x);
  });

  test("has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/beauty-concierge");
    // Wait for the streamed rail to replace its skeleton.
    await expect(page.getByRole("complementary", { name: "Profil kecantikanmu" }).locator("summary")).toBeAttached();
    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test.describe("Beauty Concierge page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders its indexable content", async ({ page }) => {
    await page.goto("/beauty-concierge");
    await expect(page.getByRole("heading", { level: 1, name: "Beauty Concierge" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Cara kerja" })).toBeVisible();
    await expect(page).toHaveTitle(/Beauty Concierge/);
  });
});
