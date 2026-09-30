import { expect, test, type Request } from "@playwright/test";

// First-party analytics from the browser's side: the anonymous id is set on
// the first page response, events go to /api/analytics as beacons, and Do Not
// Track / GPC switch everything off. Storage is covered by integration tests
// and the live RLS checks (the suite never reads the database).

const isEvent = (name: string) => (request: Request) =>
  request.url().endsWith("/api/analytics") && request.method() === "POST" && (request.postData() ?? "").includes(`"name":"${name}"`);

test.describe("Analytics", () => {
  // Beacon bodies aren't visible to Playwright; make track() use its
  // keepalive fetch fallback so the payload can be asserted.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      navigator.sendBeacon = () => false;
    });
  });

  test("sends events as beacons when the browser supports them", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const ping = page.waitForRequest((request) => request.url().endsWith("/api/analytics") && request.resourceType() === "ping");
    await page.goto("/tentang-kami");
    expect((await ping).method()).toBe("POST");
    await context.close();
  });

  test("sets the first-party id and sends PAGE_VIEWED", async ({ page, context }) => {
    const event = page.waitForRequest(isEvent("PAGE_VIEWED"));
    await page.goto("/tentang-kami");
    const request = await event;
    const body = JSON.parse(request.postData() ?? "{}") as { path?: string; properties?: { pageType?: string } };
    expect(body.path).toBe("/tentang-kami");
    expect(body.properties?.pageType).toBe("other");
    expect((await request.response())?.status()).toBe(204);

    const cookie = (await context.cookies()).find((entry) => entry.name === "cns_aid");
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(cookie?.httpOnly).toBe(true);
  });

  test("sends PRODUCT_VIEWED with the product id on a product page", async ({ page }) => {
    const event = page.waitForRequest(isEvent("PRODUCT_VIEWED"));
    await page.goto("/produk/licorice-moisturizer-skin-glow");
    const body = JSON.parse((await event).postData() ?? "{}") as { productId?: string; properties?: { slug?: string } };
    expect(body.productId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.properties?.slug).toBe("licorice-moisturizer-skin-glow");
  });

  test("sends PRODUCT_SEARCHED for a search", async ({ page }) => {
    const event = page.waitForRequest(isEvent("PRODUCT_SEARCHED"));
    await page.goto("/produk?q=serum");
    const body = JSON.parse((await event).postData() ?? "{}") as { properties?: { query?: string; results?: number } };
    expect(body.properties?.query).toBe("serum");
    expect(typeof body.properties?.results).toBe("number");
  });

  test("the endpoint refuses cross-site posts and server-only events", async ({ request, baseURL }) => {
    const crossSite = await request.post("/api/analytics", { data: { name: "PAGE_VIEWED" }, headers: { origin: "https://evil.test" } });
    expect(crossSite.status()).toBe(403);
    const forged = await request.post("/api/analytics", { data: { name: "ORDER_CREATED" }, headers: { origin: baseURL ?? "" } });
    expect(forged.status()).toBe(400);
  });

  test.describe("with Global Privacy Control", () => {
    test.use({ extraHTTPHeaders: { "Sec-GPC": "1" } });

    test("sets no id and sends no events", async ({ page, context }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true }));
      const sent: string[] = [];
      page.on("request", (request) => {
        if (request.url().endsWith("/api/analytics")) sent.push(request.url());
      });
      await page.goto("/produk/licorice-moisturizer-skin-glow");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Give the tracker time it would need to fire.
      await page.waitForTimeout(1500);
      expect(sent).toEqual([]);
      expect((await context.cookies()).find((entry) => entry.name === "cns_aid")).toBeUndefined();
    });
  });

  test("privacy policy explains analytics and is linked from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Kebijakan Privasi" }).click();
    await expect(page).toHaveURL(/\/kebijakan-privasi$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kebijakan Privasi");
    await expect(page.getByText("Data kejadian mentah disimpan paling lama 180 hari")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Global Privacy Control").first()).toBeVisible();
  });
});
