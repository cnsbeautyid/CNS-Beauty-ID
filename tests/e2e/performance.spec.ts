import { expect, test, type Page } from "@playwright/test";

// First-load JavaScript budget for the storefront (Phase 20). Measured as
// transferred (compressed) bytes of scripts received before the `load` event;
// anything deferred until after load/idle (e.g. the Supabase auth client) is
// intentionally excluded.
const JS_BUDGET_BYTES = 220 * 1024;

type Script = { url: string; bytes: number; body: string };

async function firstLoadScripts(page: Page, path: string): Promise<Script[]> {
  const scripts: Script[] = [];
  const pending: Promise<void>[] = [];
  let loaded = false;
  page.on("load", () => {
    loaded = true;
  });
  page.on("response", (response) => {
    if (loaded || response.request().resourceType() !== "script") return;
    pending.push(
      (async () => {
        const body = await response.text().catch(() => "");
        const sizes = await response.request().sizes().catch(() => null);
        scripts.push({ url: response.url(), bytes: sizes?.responseBodySize || body.length, body });
      })(),
    );
  });
  await page.goto(path, { waitUntil: "load" });
  await Promise.all(pending);
  return scripts;
}

async function productPath(page: Page): Promise<string> {
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const url = sitemap.match(/<loc>(https?:\/\/[^<]+\/produk\/[a-z0-9-]+)<\/loc>/)?.[1];
  expect(url, "a product in the sitemap").toBeTruthy();
  return new URL(url!).pathname;
}

test.describe("Performance budget", () => {
  for (const path of ["/", "/produk", "PRODUCT", "/beauty-concierge", "/faq"]) {
    test(`first load of ${path} stays within the JS budget without the auth client`, async ({ page }) => {
      const target = path === "PRODUCT" ? await productPath(page) : path;
      const scripts = await firstLoadScripts(page, target);
      const total = scripts.reduce((sum, script) => sum + script.bytes, 0);
      expect(scripts.length, "scripts measured").toBeGreaterThan(0);
      expect(total, `${target}: ${Math.round(total / 1024)} kB of JS`).toBeLessThanOrEqual(JS_BUDGET_BYTES);
      expect(scripts.filter((script) => script.body.includes("GoTrueClient")).map((script) => script.url)).toEqual([]);
    });
  }

  test("the favicon is small", async ({ request }) => {
    const response = await request.get("/icon.png");
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeLessThan(10 * 1024);
  });
});
