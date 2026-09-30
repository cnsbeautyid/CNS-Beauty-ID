# Phase 20 Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove full Zod and the Supabase browser client from every storefront page's first load, shrink the favicon, and guard the result with a JavaScript budget test.

**Architecture:**
- The browser-side env parsing moves to a Zod-free `src/lib/env/public.ts`. `schema.ts` re-exports it, so the server and the existing tests are unchanged.
- The shared AI protocol and conversation persistence switch to `zod/mini`, with the same rules, still in one file.
- The auth listener imports the Supabase client dynamically, after the page `load` event and an idle period, through a small testable scheduler.
- A Playwright spec measures the transferred JavaScript on first load, up to the `load` event.

**Tech Stack:** Next.js 16, Zod 4.6 (`zod/mini`), Zustand, Playwright, Vitest, macOS `sips`, Lighthouse 12 via `npx` (measurement only, not a dependency).

**Spec:** `docs/superpowers/specs/2026-10-01-performance-design.md`

## Global Constraints

- No new dependencies. Lighthouse runs through `npx`, for measurement only.
- **Behaviour must not change.** `tests/unit/env.test.ts`, the protocol tests in `tests/unit/ai.test.ts`, and `tests/unit/ai-store-persist.test.ts` pass **unchanged**. Don't edit them to make them pass.
- The server env keeps full Zod. Form pages keep full Zod with React Hook Form.
- Same-tab sign-out still clears the conversation synchronously (`SignOutForm`, Phase 17).
- JS budget: at most **220 kB** transferred per key page on first load, measured up to the `load` event.
- E2E runs against a fresh production build, started with `ENABLE_DESIGN_PREVIEW=true npm run start -- --port 3100`. Stop any listener on 3100 before every rebuild.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The idle callback firing before `load`,** which would pull the Supabase client into first load anyway. The scheduler must wait for `load` first. Pinned in Task 4 (`scheduleAfterLoadIdle`) and Task 1 (E2E `GoTrueClient` check).
2. **`zod/mini` accepting something full Zod rejected, or the reverse.** Examples: trimming, lengths, the last-message-is-user refine, the `javascript:` handoff URL, a non-UUID id. Pinned by the unchanged `ai.test.ts` and `ai-store-persist.test.ts`.
3. **A secret key in the public env var** must still throw, with the same message. Pinned by the unchanged `env.test.ts`.
4. **Unmounting before the lazy import resolves** must not leave an auth subscription running. Pinned in Task 4 (the cancel test) and by code review.
5. **A budget that flakes,** or silently measures nothing. The spec asserts at least one script was measured. Pinned in Task 1.

---

## File Structure

| File | Responsibility |
|---|---|
| `tests/e2e/performance.spec.ts` (new) | first-load JS budget, no `GoTrueClient`, favicon size |
| `src/lib/env/public.ts` (new) | Zod-free `isPrivilegedSupabaseKey`, `parseClientEnv`, `ClientEnv` |
| `src/lib/env/schema.ts` | re-exports the three above; server schema unchanged |
| `src/lib/env/client.ts` | imports `./public` |
| `src/services/ai/protocol.ts`, `src/stores/ai-persistence.ts` | `zod/mini` |
| `src/lib/utils/idle.ts` (new) | `scheduleAfterLoadIdle(task, deps?)` |
| `src/features/ai/use-conversation-session.ts` | dynamic Supabase import through the scheduler |
| `tests/unit/env-public.test.ts`, `tests/unit/idle.test.ts` (new) | guards and scheduler tests |
| `src/app/icon.png` | 48×48 |
| `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_CHECKLIST.md` | Phase 20 summary with a before/after table |

---

### Task 1: Budget spec first (RED)

**Files:**
- Create: `tests/e2e/performance.spec.ts`

- [ ] **Step 1: Write the spec.** Create `tests/e2e/performance.spec.ts`:

```ts
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
```

If `/icon.png` returns 404, read the `<link rel="icon">` `href` from `/` and request that instead, then record a ruling.

- [ ] **Step 2: Run it against today's build to confirm it fails.** No source has changed since the last production build (only docs), so the existing `.next` build is current. Stop any server on 3100, start `ENABLE_DESIGN_PREVIEW=true npm run start -- --port 3100`, wait for HTTP 200, then run `npx playwright test tests/e2e/performance.spec.ts`.

Expected: every budget test fails, at about 340 kB and with `GoTrueClient` present, and the favicon test fails at about 100 kB. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/performance.spec.ts
git commit -m "test(perf): first-load JS budget, no auth client on first view, small favicon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Zod-free client env

**Files:**
- Create: `src/lib/env/public.ts`, `tests/unit/env-public.test.ts`
- Modify: `src/lib/env/schema.ts`, `src/lib/env/client.ts`
- Test: `tests/unit/env.test.ts` (unchanged)

**Interfaces:**
- Produces: `src/lib/env/public.ts` exports `isPrivilegedSupabaseKey`, `parseClientEnv(source): ClientEnv`, and `type ClientEnv`. `schema.ts` re-exports all three.

- [ ] **Step 1: Write the failing guard.** Create `tests/unit/env-public.test.ts`:

```ts
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseClientEnv as fromPublic } from "@/lib/env/public";
import { parseClientEnv as fromSchema } from "@/lib/env/schema";

describe("public env parsing", () => {
  it("ships no Zod to the browser", () => {
    for (const file of ["src/lib/env/public.ts", "src/lib/env/client.ts"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/from "zod|from "\.\/schema"/);
    }
  });

  it("is the same function the server-side schema module exposes", () => {
    expect(fromSchema).toBe(fromPublic);
  });

  it("reports every invalid field in one message, as before", () => {
    expect(() => fromPublic({ NEXT_PUBLIC_SITE_URL: "nope", NEXT_PUBLIC_SUPABASE_URL: "also nope" })).toThrow(
      /^Invalid public environment: NEXT_PUBLIC_SITE_URL: .+; NEXT_PUBLIC_SUPABASE_URL: .+/,
    );
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/unit/env-public.test.ts`
Expected: FAIL, because `@/lib/env/public` can't be resolved.

- [ ] **Step 3: Implement.** Create `src/lib/env/public.ts`. `isPrivilegedSupabaseKey` is moved verbatim from `schema.ts`.

```ts
// Browser-safe env parsing with no dependencies: this module ships to every
// page, so it must not pull in Zod. Rules mirror the former Zod schema exactly
// (tests/unit/env.test.ts is the contract).

export type ClientEnv = {
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * A browser-exposed key must never carry elevated privileges. Rejects the new
 * `sb_secret_` keys and legacy JWT keys whose role is `service_role`.
 */
export function isPrivilegedSupabaseKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;

  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    // atob works in both the browser and Node; this module ships to both.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded: unknown = JSON.parse(atob(base64));
    return typeof decoded === "object" && decoded !== null && "role" in decoded && decoded.role === "service_role";
  } catch {
    return false;
  }
}

const blankToUndefined = (value: string | undefined) => (value === undefined || value.trim() === "" ? undefined : value);

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const issues: string[] = [];
  const siteUrl = blankToUndefined(source.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;
  const supabaseUrl = blankToUndefined(source.NEXT_PUBLIC_SUPABASE_URL);
  const key = blankToUndefined(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!isUrl(siteUrl)) issues.push("NEXT_PUBLIC_SITE_URL: Invalid URL");
  if (supabaseUrl !== undefined && !isUrl(supabaseUrl)) issues.push("NEXT_PUBLIC_SUPABASE_URL: Invalid URL");
  if (key !== undefined && isPrivilegedSupabaseKey(key)) {
    issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret/service-role key. Use the publishable key.");
  }
  if (issues.length > 0) throw new Error(`Invalid public environment: ${issues.join("; ")}`);

  return {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    ...(supabaseUrl !== undefined && { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl }),
    ...(key !== undefined && { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }),
  };
}
```

In `src/lib/env/schema.ts`:
- delete `isPrivilegedSupabaseKey`, `clientEnvSchema`, the `ClientEnv` type and `parseClientEnv`;
- add `export { isPrivilegedSupabaseKey, parseClientEnv, type ClientEnv } from "./public";`;
- keep everything server-side exactly as it is.
- First run `grep -rn clientEnvSchema src tests`. If anything imports it, switch that import to `parseClientEnv` and record a ruling.

In `src/lib/env/client.ts`, change `import { parseClientEnv } from "./schema";` to `import { parseClientEnv } from "./public";`.

- [ ] **Step 4: Run the new guard, the unchanged env tests, typecheck and lint**

Run: `npx vitest run tests/unit/env-public.test.ts tests/unit/env.test.ts && npm run typecheck && npm run lint`
Expected: PASS. `git diff --stat tests/unit/env.test.ts` is empty.

- [ ] **Step 5: Commit**

```bash
git add src/lib/env/public.ts src/lib/env/schema.ts src/lib/env/client.ts tests/unit/env-public.test.ts
git commit -m "perf(env): Zod-free public env parsing for the browser bundle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `zod/mini` for the AI protocol and conversation persistence

**Files:**
- Modify: `src/services/ai/protocol.ts`, `src/stores/ai-persistence.ts`, `tests/unit/env-public.test.ts` (guard)
- Test: `tests/unit/ai.test.ts`, `tests/unit/ai-store-persist.test.ts`, `tests/integration/concierge.test.ts` (all unchanged)

- [ ] **Step 1: Add the guard test.** Append to `tests/unit/env-public.test.ts`:

```ts
describe("shared AI modules", () => {
  it("use zod/mini, not the full Zod bundle", () => {
    for (const file of ["src/services/ai/protocol.ts", "src/stores/ai-persistence.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/from "zod\/mini"/);
      expect(source).not.toMatch(/from "zod";/);
    }
  });
});
```

Run: `npx vitest run tests/unit/env-public.test.ts`
Expected: FAIL on the new test.

- [ ] **Step 2: Convert `src/services/ai/protocol.ts`.** Change `import { z } from "zod";` to `import * as z from "zod/mini";`, then rewrite the three schemas with the same rules:

```ts
export const productCardSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  compareAtPrice: z.optional(z.number()),
  available: z.boolean(),
  imageUrl: z.optional(z.string()),
  shortDescription: z.optional(z.string()),
});

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("meta"), conversationId: z.nullable(z.string()) }),
  z.object({ type: z.literal("status"), label: z.string() }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("products"), items: z.array(productCardSchema) }),
  z.object({ type: z.literal("handoff"), url: z.nullable(z.string()) }),
  z.object({ type: z.literal("unavailable"), message: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("done") }),
]);

export const chatRequestSchema = z.object({
  conversationId: z.optional(z.uuid()),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().check(z.trim(), z.minLength(1), z.maxLength(MAX_MESSAGE_LENGTH)) }))
    .check(
      z.minLength(1),
      z.maxLength(MAX_HISTORY),
      z.refine((messages) => messages.at(-1)?.role === "user", "The last message must come from the user."),
    ),
  // Context only, never authorization: the server resolves identity itself.
  pageContext: z.optional(
    z.object({
      pageType: z.enum(PAGE_TYPES),
      productSlug: z.optional(z.string().check(z.regex(/^[a-z0-9-]{1,80}$/))),
      productName: z.optional(z.string().check(z.maxLength(120))),
    }),
  ),
});
```

`MAX_HISTORY`, `MAX_MESSAGE_LENGTH` and `PAGE_TYPES` must be declared **before** `chatRequestSchema`, as they are now. Keep `encodeEvent`, `createEventDecoder`, the constants, and `export type ChatRequest = z.infer<typeof chatRequestSchema>;` unchanged. Check that the server caller (`src/app/api/ai/chat/route.ts`) still typechecks. It uses `.safeParse`, which `zod/mini` supports.

- [ ] **Step 3: Convert `src/stores/ai-persistence.ts`.** Change `import { z } from "zod";` to `import * as z from "zod/mini";`, and rewrite:

```ts
const messageSchema = z.object({
  id: z.string().check(z.maxLength(64)),
  role: z.enum(["user", "assistant"]),
  content: z.string().check(z.maxLength(20_000)),
  products: z.array(productCardSchema).check(z.maxLength(MAX_STORED_PRODUCTS)),
  // Rendered as a link: only https, so a tampered value can't become javascript:.
  handoffUrl: z.optional(z.nullable(z.string().check(z.regex(/^https:\/\//)))),
  state: z.enum(["streaming", "done", "error", "unavailable"]),
});

const persistedSchema = z.object({
  conversationId: z.nullable(z.uuid()),
  ownerKey: z.optional(z.nullable(z.string().check(z.maxLength(32)))),
  messages: z.array(messageSchema).check(z.maxLength(MAX_HISTORY)),
});
```

- [ ] **Step 4: Run the unchanged behaviour tests, the guard, typecheck and lint**

Run: `npx vitest run tests/unit/ai.test.ts tests/unit/ai-store-persist.test.ts tests/integration/concierge.test.ts tests/unit/env-public.test.ts && npm run typecheck && npm run lint`
Expected: PASS. `git diff --stat tests/unit/ai.test.ts tests/unit/ai-store-persist.test.ts tests/integration/concierge.test.ts` is empty.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/protocol.ts src/stores/ai-persistence.ts tests/unit/env-public.test.ts
git commit -m "perf(ai): zod/mini for the shared chat protocol and conversation persistence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Supabase client after load and idle

**Files:**
- Create: `src/lib/utils/idle.ts`, `tests/unit/idle.test.ts`
- Modify: `src/features/ai/use-conversation-session.ts`

**Interfaces:**
- Produces: `scheduleAfterLoadIdle(task: () => void, deps?: IdleDeps): () => void`, where `IdleDeps = { isLoaded(): boolean; onLoad(cb): () => void; whenIdle(cb): () => void }`, and the return value cancels.

- [ ] **Step 1: Write the failing tests.** Create `tests/unit/idle.test.ts`:

```ts
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { scheduleAfterLoadIdle } from "@/lib/utils/idle";

function fakeDeps(loaded: boolean) {
  let loadListener: (() => void) | undefined;
  let idleCallback: (() => void) | undefined;
  return {
    deps: {
      isLoaded: () => loaded,
      onLoad: (callback: () => void) => {
        loadListener = callback;
        return () => {
          loadListener = undefined;
        };
      },
      whenIdle: (callback: () => void) => {
        idleCallback = callback;
        return () => {
          idleCallback = undefined;
        };
      },
    },
    fireLoad: () => loadListener?.(),
    fireIdle: () => idleCallback?.(),
  };
}

describe("scheduleAfterLoadIdle", () => {
  it("waits for the load event, then for idle", () => {
    const task = vi.fn();
    const { deps, fireLoad, fireIdle } = fakeDeps(false);
    scheduleAfterLoadIdle(task, deps);
    fireIdle();
    expect(task).not.toHaveBeenCalled();
    fireLoad();
    expect(task).not.toHaveBeenCalled();
    fireIdle();
    expect(task).toHaveBeenCalledOnce();
  });

  it("goes straight to idle when the page has already loaded", () => {
    const task = vi.fn();
    const { deps, fireIdle } = fakeDeps(true);
    scheduleAfterLoadIdle(task, deps);
    fireIdle();
    expect(task).toHaveBeenCalledOnce();
  });

  it("never runs after being cancelled, at either stage", () => {
    const task = vi.fn();
    const early = fakeDeps(false);
    scheduleAfterLoadIdle(task, early.deps)();
    early.fireLoad();
    early.fireIdle();

    const late = fakeDeps(true);
    scheduleAfterLoadIdle(task, late.deps)();
    late.fireIdle();
    expect(task).not.toHaveBeenCalled();
  });
});

describe("conversation session", () => {
  it("loads the Supabase browser client lazily, never at module load", () => {
    const source = readFileSync("src/features/ai/use-conversation-session.ts", "utf8");
    expect(source).not.toMatch(/^import .*from "@\/lib\/supabase\/client"/m);
    expect(source).toMatch(/import\("@\/lib\/supabase\/client"\)/);
    expect(source).toMatch(/scheduleAfterLoadIdle/);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/unit/idle.test.ts`
Expected: FAIL, because `@/lib/utils/idle` can't be resolved.

- [ ] **Step 3: Implement.** Create `src/lib/utils/idle.ts`:

```ts
// Defers non-critical work until the page has loaded and the browser is idle,
// so it never competes with first paint or hydration (Phase 20).

export type IdleDeps = {
  isLoaded(): boolean;
  onLoad(callback: () => void): () => void;
  whenIdle(callback: () => void): () => void;
};

const IDLE_FALLBACK_MS = 1500;

function browserDeps(): IdleDeps {
  return {
    isLoaded: () => document.readyState === "complete",
    onLoad: (callback) => {
      window.addEventListener("load", callback, { once: true });
      return () => window.removeEventListener("load", callback);
    },
    whenIdle: (callback) => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(() => callback(), { timeout: IDLE_FALLBACK_MS });
        return () => window.cancelIdleCallback(id);
      }
      const id = window.setTimeout(callback, IDLE_FALLBACK_MS);
      return () => window.clearTimeout(id);
    },
  };
}

/** Runs `task` once, after `load` and then idle. The returned function cancels it. */
export function scheduleAfterLoadIdle(task: () => void, deps: IdleDeps = browserDeps()): () => void {
  let cancelIdle: (() => void) | undefined;
  let cancelLoad: (() => void) | undefined;
  let cancelled = false;
  const toIdle = () => {
    if (cancelled) return;
    cancelIdle = deps.whenIdle(() => {
      if (!cancelled) task();
    });
  };
  if (deps.isLoaded()) toIdle();
  else cancelLoad = deps.onLoad(toIdle);
  return () => {
    cancelled = true;
    cancelLoad?.();
    cancelIdle?.();
  };
}
```

Replace the body of `src/features/ai/use-conversation-session.ts` with:

```ts
"use client";

import { useEffect } from "react";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { scheduleAfterLoadIdle } from "@/lib/utils/idle";
import { rehydrateConversationOnce, useAIStore } from "@/stores/ai-store";

/**
 * Restores this tab's conversation once, then keeps it tied to whoever is
 * signed in: when the session ends (sign-out anywhere, expiry) or a different
 * customer signs in, the stored conversation is cleared. The browser session
 * is only used to forget local data, never for authorization.
 *
 * The Supabase client is imported only after load and idle, so it is never
 * part of a page's first load. Same-tab sign-out still clears the conversation
 * immediately (SignOutForm).
 */
export function useConversationSession(): void {
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let cancelSchedule: (() => void) | undefined;
    void Promise.resolve(rehydrateConversationOnce()).then(() => {
      if (!active || !getSupabasePublicConfig()) return;
      cancelSchedule = scheduleAfterLoadIdle(() => {
        void import("@/lib/supabase/client").then(({ createClient }) => {
          if (!active) return;
          const { data } = createClient().auth.onAuthStateChange((_event, session) => {
            useAIStore.getState().syncOwner(session?.user.id ?? null);
          });
          unsubscribe = () => data.subscription.unsubscribe();
        });
      });
    });
    return () => {
      active = false;
      cancelSchedule?.();
      unsubscribe?.();
    };
  }, []);
}
```

- [ ] **Step 4: Run the tests, the full unit suite, typecheck and lint**

Run: `npx vitest run tests/unit/idle.test.ts && npm run test && npm run typecheck && npm run lint`
Expected: PASS, with 4 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/idle.ts src/features/ai/use-conversation-session.ts tests/unit/idle.test.ts
git commit -m "perf(ai): load the Supabase auth listener after load and idle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Favicon

**Files:**
- Modify: `src/app/icon.png`

- [ ] **Step 1: Resize with macOS `sips`**

```bash
sips -z 48 48 src/app/icon.png --out src/app/icon.png
file src/app/icon.png && ls -l src/app/icon.png
```

Expected: `PNG image data, 48 x 48`, under 10 kB.

- [ ] **Step 2: Commit**

```bash
git add src/app/icon.png
git commit -m "perf: 48x48 favicon (was 512x512, 100 kB)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: GREEN, measurement, docs

**Files:**
- Modify: `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_CHECKLIST.md`

- [ ] **Step 1: Full validation, then the whole E2E suite.**
  1. Stop any server on 3100.
  2. `npm run validate` into a log.
  3. Start `ENABLE_DESIGN_PREVIEW=true npm run start -- --port 3100`.
  4. `npx playwright test` into a log.

Expected: validate passes, and Playwright reports 0 failed, including `performance.spec.ts` and the AI concierge specs.

**If a budget test still fails:**
- find which first-load chunks still contain `ZodError` or `GoTrueClient` (`grep -l` over `.next/static/chunks`);
- trace the importing module;
- fix it the same way;
- record a ruling;
- rerun.

Don't raise the budget without the owner's agreement.

- [ ] **Step 2: Lighthouse, after.** With the server running, measure the five pages with the baseline command, simulated and with `--throttling-method=devtools` for `/` and `/produk`:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx -y lighthouse@12 "http://localhost:3100<path>" --only-categories=performance --output=json --output-path=<file> --chrome-flags="--headless=new" --quiet
```

Record the score, LCP, CLS, TBT and JS transferred. Target: simulated score at least 90 on all five, and JS at most 220 kB. A simulated score under 90 that comes only from LCP modelling, while real-throttling LCP stays under 2.5s, is recorded as a ruling, not chased with out-of-scope changes. Stop the server.

- [ ] **Step 3: Update the docs.**
  - **`docs/ARCHITECTURE.md` header:** `(Phase 20)`, "Phase 20 Performance, done and validated", next "Phase 21 Accessibility".
  - **Add "Phase 20 summary"** above "Phase 19 summary":
    - the owner decision;
    - a before/after table for the five pages (score, LCP simulated, LCP real where measured, TBT, JS kB);
    - what changed;
    - the budget spec;
    - the note that cross-tab sign-out and expiry are detected after an idle period, while same-tab sign-out is immediate;
    - still open: fonts, critical CSS.
  - **Validation row 20.**
  - **`IMPLEMENTATION_CHECKLIST.md`:** add `- [x] Performance (Phase 20: shared JS −… kB, JS budget test, favicon)`, filling in the measured reduction.
- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md docs/IMPLEMENTATION_CHECKLIST.md
git commit -m "docs: Phase 20 performance summary with before/after measurements

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
