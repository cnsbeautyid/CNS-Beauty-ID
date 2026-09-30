# Phase 20: Performance — Design

- **Date:** 2026-10-01
- **Status:** approved in brainstorming, awaiting spec review
- **Scope source:** master prompt §23 (performance targets: LCP < 2.5s, CLS < 0.1, INP < 200ms) and the §26 phase list; CLAUDE.md §7 and §13
- **Branch:** `feat/phase-20-performance` (stacked on `feat/phase-19-seo`)

## 1. Goal

Stop shipping about 155 kB (transferred) of JavaScript that every storefront page loads but doesn't need on first view. Shrink the favicon. Add an automated budget so this kind of regression is caught.

### Owner decision (2026-10-01)

"Cut shared JS + quick wins". Fonts, critical-CSS inlining and image formats are out of scope.

### Baseline (local production build, Lighthouse 12 mobile, 2026-10-01)

| Page | Score (simulated) | LCP (simulated) | LCP (DevTools throttling) | CLS | TBT (simulated) | JS transferred |
|---|---|---|---|---|---|---|
| `/` | 74 | 5.26s | 1.75s | 0 | 286ms | 339 kB |
| `/produk` | 79 | 4.69s | 1.62s | 0 | 223ms | 346 kB |
| `/produk/licorice-moisturizer-skin-glow` | 96 | 1.88s | — | 0 | 210ms | 342 kB |
| `/beauty-concierge` | 99 | 1.73s | — | 0 | 112ms | 341 kB |
| `/faq` | 86 | 1.96s | — | 0 | 517ms | 339 kB |

**Real-throttling LCP already meets the target.** The simulated 5s LCPs come from Lighthouse's model: text LCP is gated on the render-blocking CSS and the script dependency chain in its simulation.

**The two largest shared chunks are unneeded on first view:**

| Chunk (raw) | Content | Why it's on every page |
|---|---|---|
| ~382 kB (≈89 kB transferred) | full **Zod** | `lib/env/client.ts` → `lib/env/schema.ts`; `stores/ai-store.ts` → `stores/ai-persistence.ts`; `features/ai/chat-client.ts` → `services/ai/protocol.ts`. The AI panel and the env are mounted and used on every page. |
| ~252 kB (≈66 kB transferred) | **Supabase browser client** (`GoTrueClient`) | `features/ai/use-conversation-session.ts` (Phase 17 fix) statically imports `@/lib/supabase/client` to listen for auth changes on every page. |

**Favicon:** `src/app/icon.png` is 512×512 at 100 kB and is fetched on every page. `apple-icon.png` (180×180, 21 kB) is fetched only by iOS and stays.

### Out of scope

- Font subsetting and fewer weights.
- Critical-CSS inlining.
- Image format work (`next/image` already serves AVIF/WebP).
- Hosted Lighthouse CI.
- Form pages that use full Zod with React Hook Form (sign-in, sign-up, checkout, account). That code loads only on those routes.

## 2. Changes

### 2.1 Zod out of the shared browser bundle

- **`src/lib/env/client.ts`** stops importing `./schema`. It validates the three `NEXT_PUBLIC_*` variables with plain checks that behave exactly as today's client schema does:
  - `NEXT_PUBLIC_SITE_URL` must be a URL, defaulting as now;
  - the Supabase URL must be a URL when set;
  - the key must be a non-empty string when set.

  The error messages stay the same. The server env keeps full Zod in `schema.ts`. The existing `tests/unit/env.test.ts` must pass unchanged. It is extended only where the client parser is now a separate function.
- **`src/services/ai/protocol.ts`** and **`src/stores/ai-persistence.ts`** switch from `zod` to `zod/mini`, Zod 4.6's tree-shakable build, with identical rules. The server route keeps importing `protocol.ts`, so there is one schema. The existing `ai.test.ts` protocol tests and `ai-store-persist.test.ts` must pass unchanged.
- **Any other module on every storefront page** that the build shows still pulling full Zod is handled the same way, and listed in the plan. Candidates: `services/analytics/model.ts`, if it's reachable from `lib/analytics/client.ts`. Check with the budget spec.

### 2.2 Supabase client loaded lazily

`useConversationSession` keeps its behaviour: restore the conversation once, then clear it when the signed-in customer changes. The change:
- It imports `@/lib/supabase/client` with `import()`.
- It does so only after rehydration, **after the page's `load` event**, and once the browser is idle (`requestIdleCallback`, or a `setTimeout(…, 1500)` fallback). An idle callback can fire before `load`, which would put the client back into first load. Nothing Supabase-related is fetched on first view.
- Unmounting before the import resolves cancels the subscription, as today.

The same-tab sign-out button still clears the conversation synchronously (Phase 17 `SignOutForm`). Only cross-tab sign-out and session expiry are detected up to an idle period later.

### 2.3 Favicon

- Replace `src/app/icon.png` with a 48×48 PNG generated from the current icon using macOS's `sips` (no new tool). The expected size is under 10 kB.
- `apple-icon.png` stays as it is.

## 3. Budget guard

New `tests/e2e/performance.spec.ts`, which runs on both the desktop and mobile Playwright projects. For each of `/`, `/produk`, the first product from the sitemap, `/beauty-concierge` and `/faq`, it:

- records every JavaScript response on first load (until `networkidle`), summing the `content-length` or body size **after compression as served**. Transferred bytes come from `response.request().sizes()`, and fall back to the body length when unavailable;
- asserts the JS total is at most **220 kB**: the 200 kB target plus about 10% headroom;
- asserts that no JS response body contains `GoTrueClient`, which proves the Supabase auth client isn't loaded on first view;
- checks that `/icon.png` is under 10 kB, as its own test.

The spec is written first and must fail on today's build.

## 4. Targets and measurement

- **JS:** at most 220 kB transferred on each of the five pages (budget spec). The design target is about 200 kB.
- **Lighthouse 12 mobile, simulated:** a score of at least 90 on all five pages.
- **Real-throttling LCP** stays at or below today's numbers.
- **CLS** stays 0.
- **Measurement:** the same command as the baseline, recorded in `docs/ARCHITECTURE.md` (a Phase 20 summary with a before/after table).

## 5. Testing and validation

- **Unchanged tests pinning behaviour:** `env.test.ts`, the protocol tests in `ai.test.ts`, and `ai-store-persist.test.ts`.
- **New unit test:** `useConversationSession`'s module does not statically import `@/lib/supabase/client`. It subscribes only after rehydrate and idle, using a mocked dynamic import and fake timers, in the node environment by testing an extracted pure scheduler `scheduleAfterLoadIdle(task, deps)` in `src/lib/utils/idle.ts`.
- **New E2E:** `performance.spec.ts` (§3).
- **Full validation:** `npm run validate` and the full Playwright suite, including the AI concierge and sign-out specs, with the server started with `ENABLE_DESIGN_PREVIEW=true`.
- **Lighthouse:** before and after, as in §4.

## 6. Risks

- **`zod/mini` API differences** (functional `z.optional`, `.check(...)`). Mitigation: the unchanged behaviour tests.
- **Cross-tab sign-out and expiry are detected slightly later** (idle ≤ about 1.5s). Accepted: same-tab sign-out is still immediate.
- **Budget flakiness.** Mitigation: 10% headroom, and measured on the production build only.
- **A future phase adds a global client import** (for example analytics). The budget spec fails, and that is the point.
