# CNS Beauty Commerce — Architecture & Status

Living document. Updated at the end of every phase.

- **Last updated:** 2026-10-01 (Phase 20)
- **Current phase:** Phase 20 Performance, done and validated
- **Next phase:** Phase 21 Accessibility (then E2E, Production hardening per the master prompt)

## Phase 20 summary

Owner decision (2026-10-01): cut the shared JavaScript plus quick wins; fonts and critical CSS are out of scope. Spec: `docs/superpowers/specs/2026-10-01-performance-design.md`.

**Before → after** (local production build, Lighthouse 12 mobile). The JS column is first-load JavaScript transferred.

| Page | Score (simulated) | LCP (simulated) | LCP (real throttling) | TBT | First-load JS |
|---|---|---|---|---|---|
| `/` | 74 → **91** | 5.26 → 3.49s | 1.75 → **1.60s** | 286 → **41ms** | 339 → **210 kB** |
| `/produk` | 79 → **86** | 4.69 → 4.16s | 1.62 → **1.57s** | 223 → **38ms** | 346 → **217 kB** |
| product page | 96 → **99** | 1.88 → 2.00s | — | 210 → **18ms** | 342 → **213 kB** |
| `/beauty-concierge` | 99 → **100** | 1.73 → 1.86s | — | 112 → **20ms** | 341 → **212 kB** |
| `/faq` | 86 → **100** | 1.96 → 1.87s | — | 517 → **14ms** | 339 → **210 kB** |

CLS is 0 everywhere, before and after. With real throttling, `/` and `/produk` both score 99. The remaining simulated-LCP gap on `/` and `/produk` comes from Lighthouse's model gating text LCP on render-blocking CSS and fonts; that's the next lever.

- **Zod out of every page:**
  - `lib/env/public.ts` does the client env parsing with plain checks; `schema.ts` re-exports it and keeps full Zod for the server env.
  - `zod/mini` is used for the shared AI protocol and conversation persistence, with the same rules and the unchanged tests.
  - The catalog option lists moved to a Zod-free `services/catalog/options.ts`, used by the client sort control.
  - Form pages keep full Zod with React Hook Form.
- **Supabase auth client after load and idle:** `useConversationSession` imports it through `scheduleAfterLoadIdle` (`lib/utils/idle.ts`). The 66 kB chunk loads after the page and the browser are idle, never on first view. Same-tab sign-out still clears the conversation immediately; cross-tab sign-out and session expiry are detected after that idle period.
- **Favicon:** 512×512 at 100 kB → 48×48 at 3.7 kB.
- **Budget guard:** `tests/e2e/performance.spec.ts` checks the five key pages on desktop and mobile. First-load JS must be at most 220 kB, with no `GoTrueClient` before `load`, and the favicon under 10 kB. Future global client imports will fail it.
- **Still open:** font files (~1.3–1.5s to arrive) and the render-blocking stylesheet (~730ms).

## Phase 19 summary

Owner decisions (2026-10-01): technical SEO plus `/faq` and `/kontak`; a branded default share image; Artikel and Paket hidden until built. Spec: `docs/superpowers/specs/2026-10-01-seo-design.md`.

- **`/robots.txt`** (`buildRobots`): indexable only when `VERCEL_ENV === "production"`; private areas disallowed; preview and local builds disallow everything. **If the site leaves Vercel, change the production signal.**
- **`/sitemap.xml`** (`buildSitemap`, hourly): the fixed public pages, visible categories, and active products (paged past the 1000-row cap) with `lastModified` and image. `/testimoni` and `/faq` are listed only with content. Falls back to the fixed pages when the catalog can't be read.
- **Share previews:** root Open Graph (`siteName`, `id_ID`) and Twitter `summary_large_image`; a default 1200×630 card (`opengraph-image.tsx`, Cormorant Garamond 600, OFL, in `src/assets/fonts`). Product pages keep their photo.
- **Canonicals** on every indexable page; newly added on `/`, `/manfaat`, `/tentang-kami`, `/testimoni`, `/faq`, `/kontak`.
- **JSON-LD** (`src/lib/seo/structured-data.ts`):
  - `Organization` and `WebSite` (search → `/produk?q=`) on the home page. `sameAs` comes only from verified `SOCIAL_LINKS` (empty today).
  - `BreadcrumbList` on products, categories, `/faq` and `/kontak`.
  - `FAQPage` from exactly the rendered approved FAQs.
  - The product `aggregateRating` only appears with reviews.
- **`/faq`:** approved FAQs by topic, keyboard `<details>`, plain-text answers; `noindex` when empty or failing. **`/kontak`:** WhatsApp, Instagram, email and city from `settings.contact`, plus Beauty AI.
- **Nav:** Artikel and Paket are hidden until those pages exist.
- **Owner:** submit `/sitemap.xml` in Google Search Console after the production deploy.

## Phase 18 summary

Owner decisions (2026-09-30): privacy limit plus long-term trends; raw events kept 180 days; long-term totals are events per day only; a trend section in admin. Spec: `docs/superpowers/specs/2026-09-30-analytics-retention-design.md`.

- **`analytics_daily_events`** (migration `20261001010000_analytics_retention`, applied to live): WIB day × event name → events, unique visitors that day. No identifiers; kept indefinitely. RLS: admin `SELECT` only; only the service role writes.
- **`analytics_rollup_and_purge(p_retention_days = 180)`** (`SECURITY DEFINER`, execute: service role only):
  - Upserts totals from 2 days before the latest stored day, clamped to the purge boundary. The first run backfills everything.
  - Deletes raw events in **whole WIB days** older than the retention period, and only days that have totals. Batches of 10,000, at most 100 per run.
  - Rejects retention below 90 days.
- **Nightly trigger:** `/api/cron/analytics-retention` (Vercel cron, 01:30 WIB), `CRON_SECRET` bearer check shared with `expire-orders` (`src/lib/auth/cron.ts`). It returns and logs `{ daysRolledUp, rowsUpserted, rowsDeleted }`, and 500 on failure; the next run catches up.
- **Admin:** "Tren jangka panjang" on `/admin/analytics?tren=3|6|12`: weekly SVG lines (page-view and order visitors), a monthly table with conversion. Visitors are summed per day, and the caption says so.
- **Privacy page:** states the 180-day limit (legal review by the owner still pending).
- **Verified on live** in a rolled-back transaction: WIB day boundaries, idempotent re-runs, first-run backfill before purge (this check caught `greatest()` ignoring NULLs, which would have skipped the backfill; fixed before applying), whole-day purge that never deletes a day without totals, the guard, privileges, and staff/customer RLS. Security advisors: nothing new.
- **Not covered by E2E:** the admin trend section (the suite never signs in). Covered by `buildTrend` unit tests and the cron route integration tests.

## Phase 17 summary

Owner decisions (2026-09-30): a full-page chat (not a landing page or guided flow); the conversation survives a reload through `sessionStorage`; a personal-context side rail. Spec: `docs/superpowers/specs/2026-09-30-beauty-concierge-page-design.md`.

- **`/beauty-concierge`** (Server Component, indexable): h1, intro, a "Cara kerja" section, canonical and Open Graph. The site nav link no longer 404s.
- **One conversation, two surfaces:** `ConciergeConversation` (`src/components/ai/concierge-conversation.tsx`) is the chat body for both the floating panel and the page, on the same `useAIStore`. The launcher is hidden on the page, and an open panel closes.
- **Persistence:** `persist` keeps `conversationId` and the last 20 messages in `sessionStorage` (`cns-ai-conversation`, v1).
  - Writes are gated until rehydration, because persist writes on every set, even before hydrating.
  - Restored data is Zod-validated (https-only handoff links, UUID id), and a reply cut off by the reload comes back as "Jawaban dihentikan."
  - Sign-out clears it. So does any change of signed-in customer seen by the browser session (sign-out in another tab, session expiry, a different account): the conversation carries a hashed owner key (never the raw user id), and a guest's conversation carries over when they sign in.
  - Restored product cards keep images only from this project's public Storage (same rule as the catalog), and at most 24 cards per message.
  - Restored once per tab: a later panel remount never replaces a reply that is still streaming.
- **One chat surface:** on `/beauty-concierge` the launcher is hidden, and the header, mobile-menu and "Ask AI" entry points pre-fill and focus the inline chat instead of opening the panel.
- **Side rail** (`src/features/beauty-concierge/`): the skin profile, routine step counts and CNS Rewards points, read through RLS with the existing services, behind `<Suspense>`.
  - Signed-out and no-profile visitors get the Skin Quiz CTA. A failed profile read, or a session check that fails (`getSessionState` → `"unknown"`), shows the no-profile view, never "Masuk".
  - The rail only displays data; the AI reads the same data through its own tools.
  - The decisions live in the pure `buildRailModel`, which is unit-tested.
- **AI context:** new page type `"concierge"` (a hint, never authorization). `AI_OPENED { source: "page" }` fires on the page.
- **Not covered by E2E:** the signed-in rail (the suite never signs in; see Phase 20).

## Phase 16 summary

**Owner decisions:**
- Apply the migration to the live DB.
- Map the 36 legacy events to the new names.
- No consent banner: minimal first-party analytics is on by default. Do Not Track / GPC are honoured, and a privacy page explains it. Final legal sign-off stays with the owner.

- **Event contract** (`constants/analytics.ts`; migration `20260930120000_analytics_events_v1`, applied to live):
  - The 20 names from CLAUDE.md §14 / PRD §30, plus both `PRODUCT_RECOMMENDATION_VIEWED` (CLAUDE.md) and `AI_RECOMMENDATION_VIEWED` (PRD). The DB `CHECK` lists the same set.
  - `event_version` (1 = this contract; the 36 migrated rows are 0: 25 `PRODUCT_VIEWED`, 11 `AI_OPENED`).
  - `properties` must be a JSON object of at most 2 KB. `path` is at most 300 characters. `anonymous_id` must be UUID-shaped.
  - Per-event property schemas for browser events (`services/analytics/model.ts`) drop unknown keys.
- **Ingestion is server-only** (closes gap #4):
  - `anon`/`authenticated` lost every privilege on `analytics_events` except `SELECT` (anon previously held full table privileges). Staff read through the existing `staff_select` policy.
  - All writes go through the service role in `services/analytics/record.ts`. **Without `SUPABASE_SERVICE_ROLE_KEY` nothing is stored**: one warning is logged and the site works normally.
  - **Browser events** (`CLIENT_EVENTS`: page/product/search/recommendation views, AI opened / recommendation viewed / accepted, checkout started, quiz started, loyalty viewed) go to `POST /api/analytics`:
    - same-origin only;
    - capped at 4 KB; rate-limited to 60 per minute per visitor id (many mobile users share one carrier IP), or 120 per minute per IP for cookieless requests;
    - validated with Zod;
    - identity comes from the session plus the first-party cookie, never from the body;
    - an AI conversation link is kept only when that conversation belongs to the visitor;
    - the response is always 204, so pages never wait.
  - **Server events** are recorded where the state change happens (`trackServerEvent`, after the response via `after()`). They can't be forged:
    - `ADD_TO_CART` (product / skin_quiz / reorder), `REMOVE_FROM_CART`, `VOUCHER_APPLIED` (discount only; the code is left out because it may be a personal referral code);
    - `ORDER_CREATED` (checkout);
    - `PAYMENT_STARTED` (payment proof uploaded);
    - `ORDER_DELIVERED` (admin "delivered"; recorded as the customer, never the staff member);
    - `SKIN_QUIZ_COMPLETED`;
    - `AI_MESSAGE_SENT` and `RESELLER_AI_USED` (chat route).
  - A failed insert never affects the action.
- **Identity and PII:**
  - `cns_aid` (random UUID, httpOnly, 1 year; the Beauty Concierge already used it) is set by the proxy on the **first page response**, so browser and server events share one id.
  - The tab session id lives in `sessionStorage`. UTM tags are taken from the landing URL.
  - `path` is the pathname only, with ids and order numbers collapsed to `:id`. `/admin` and `/api` pages are never tracked. `referrer` is the external host only.
  - No names, emails, phone numbers or addresses in events.
  - **DNT / `Sec-GPC`:** the browser sends nothing, the endpoint stores nothing, the proxy sets no id, and server events are recorded with no user or anonymous id, so they appear in totals but not in funnels.
- **Reports** (`/admin/analytics?hari=7|30|90`):
  - `analytics_funnel()` / `analytics_event_counts()` are SQL functions with `SECURITY INVOKER`, so staff RLS applies and customers get empty results. Execute is revoked from anon.
  - Three funnels: primary (page → product → add to cart → checkout → order), AI (open → message → recommendation viewed → accepted → add to cart → order) and Skin Quiz.
  - Also: every event with events and unique visitors, top search terms, and visit sources (UTM / referrer host / direct).
  - Funnels count unique visitors who reached every earlier step in the window, **order-agnostic**. A visitor is the `cns_aid`, or the user id when no `cns_aid` is available; a person on two devices counts twice.
  - **The dashboard "Konversi" KPI is live:** visitors with `ORDER_CREATED` ÷ visitors with `PAGE_VIEWED` over 30 days.
- **Privacy page:** `/kebijakan-privasi`, linked in the footer. It covers the data kept, analytics, cookies, use and sharing, and rights. **Legal review by the owner is needed** before relying on it.
- **Verified on the live DB** in a rolled-back transaction:
  - legacy rows mapped;
  - old names and non-object properties rejected;
  - anon and customer inserts denied, and anon can't execute the report functions;
  - a customer sees an empty funnel, and an admin sees the correct funnel.
  - Security advisors: nothing new.
- **Also fixed:** a staff-path check that was a prefix match (`/admin-x` counted as `/admin`) is now segment-based.
- **Not yet:**
  - `REVIEW_CREATED` has no emitter (there is no review form yet).
  - Retention/aggregation of raw events: done in Phase 18.
  - A shared rate-limit store (Phase 21).

## Phase 15 summary

**RBAC, as it exists in the live DB:** `public.user_roles` with `app_role` = customer / admin / owner (2 admins, 2 owners today). `private.has_any_role()` treats owner as every staff role, and ~200 `staff_*` RLS policies already grant admins access. Decision (owner): keep admin/owner for now, with owner = super_admin (only owners manage `user_roles`). The PRD's granular content_editor / customer_service roles are deferred.

- **Authorization** (`services/admin/auth.ts`):
  - `getStaff()` reads the caller's own `user_roles` rows through RLS and never takes a role from the browser.
  - `requireStaff(path)` on every page: guests are redirected to sign-in, and signed-in non-staff get a **404** so the area isn't advertised.
  - `authorizeStaff()` is called first in every server action, and refuses with "Akses ditolak".
  - `app/admin/layout.tsx` renders the admin chrome only for staff and is noindex. The admin area sits outside the storefront shell.
- **Audit log** (migration `20260930062959_admin_audit_log`, applied with owner approval):
  - `public.admin_audit_log {actor_id, action entity.verb, entity_type, entity_id, summary jsonb, created_at}`.
  - Staff insert only as themselves (`actor_id = auth.uid()`) and read everything.
  - There are no UPDATE/DELETE policies, and those privileges are revoked. A trigger rejects UPDATE/DELETE for everyone, including service role and superuser.
  - Every successful admin action writes one entry with the changed fields (`recordAudit`). The entry is a second write after the action, not in the same transaction; a failed audit insert is logged.
- **Modules** (`/admin/*`):
  - **Dashboard**, last 30 days: GMV (paid and later), average order value, customers and new customers, repeat-purchase rate, AI conversations and escalations, AI-assisted GMV, and partner sales. **Conversion is shown as "—"** until analytics events exist (Phase 16). An action queue lists: payments to confirm, orders to ship, partner applications, knowledge to review, copy/claims not approved, and low stock.
  - **Orders:**
    - The list has status and search filters (URL state via next/form), paginated. Search terms go through `sanitizeSearch()` before any PostgREST `or()` filter.
    - Detail shows items, totals, status history, payment, and **payment proofs as 10-minute signed URLs** (private bucket, staff read policy).
    - Actions follow `allowedOrderActions`:
      - confirm payment → `mark_order_paid` for the full total (also credits loyalty);
      - cancel with a required reason → `release_order`, which restores stock, coupon use and points;
      - process / ship (courier and tracking number) / deliver → a conditional status update plus a history row with `changed_by`.
    - These use the **service role**, because `mark_order_paid` / `release_order` are service-role only and `order_status_history` has no staff insert policy. They show "kunci layanan server belum dikonfigurasi" until `SUPABASE_SERVICE_ROLE_KEY` is set.
  - **Products:**
    - Price, compare-at price, stock, low-stock threshold, status and featured flag (RHF + Zod, `productUpdateSchema`).
    - Approval of description/positioning, benefits and FAQs, with an optional evidence reference. This runs as the admin, so the review triggers stamp `reviewed_by` from `auth.uid()`, and editing approved text sends it back to review.
    - Text itself is still edited in the DB.
  - **Inventory:** products sorted by headroom above the low-stock threshold, with an inline absolute stock setter.
  - **Customers:** read-only, searchable and paginated, with paid-order count and spend.
  - **Resellers:**
    - Approving a pending application at a level (dropshipper → level 0) is conditional on `pending`, so it can't happen twice. It then upserts `partner_accounts`, and reverts the application if that upsert fails. Rejection is also offered.
    - Partner level and activate/deactivate.
    - Application history.
  - **Knowledge:** read the body, then approve / return to draft / archive. It runs as the admin, so `knowledge_review_guard` records a human approver.
  - **AI / Content / Analytics:** read-only summaries: AI conversations, escalations, safety flags, recommendations and AI orders; content status counts; analytics events by name. Conversation contents are not shown.
  - **Audit log:** the latest 100 entries with actor and details.
- **Verified on the live DB** in a rolled-back transaction:
  - A customer can't update products, approve claims, see other profiles or create partner accounts.
  - An admin can update products, approve a benefit (`reviewed_by` = admin) and a knowledge document (`approved_by` = admin), read all profiles, and approve an application and upsert its partner.
  - Audit log: a customer can't insert or read it, an admin can't spoof `actor_id`, and nobody can update or delete rows.
  - Security advisors: nothing new (only the existing leaked-password warning).
- **Also in this phase:**
  - The reseller application form uses `useWatch` (React Compiler-safe).
  - The catalog search E2E retries across hydration, fixing a pre-existing flake.
- **Not covered by E2E:** signed-in admin flows (the suite never signs in to live Auth). CLAUDE.md's "Admin → Product Management" E2E needs a test staff account on a non-production project (Phase 20).

## Phase 14 summary

**Business model, as it exists in the live DB:** partner *pricing*, not commission. `wholesale_prices` holds 10 rows: per product, 4 reseller levels with a minimum quantity each, plus a dropship price. `quote_cart` applies the partner's own level price automatically, rejects lines below `min_qty`, and refuses coupons and points for partners. There is no commission, customer or marketing data, so those portal sections were not built and nothing is invented; `ROUTES.resellerPortal.{customers,commission,marketing}` stay unlinked.

- **`/reseller`**: a public, indexable programme page (metadata and canonical URL). It covers the two partnership types, how to join, and notes. It shows no partner prices (those are RLS partner-only) and promises no earnings. The copy is DRAFT in `content/reseller.ts`.
  - The application area depends on who is visiting:
    - Guests get a sign-in or sign-up CTA (`?next=/reseller`).
    - Partners get a link to the portal.
    - Pending applicants see their status.
    - Everyone else gets the form (RHF + Zod `applicationSchema`; dropshipper is forced to level 1).
  - `submitApplicationAction` takes the user from the session and never accepts status, reviewer or user id from the browser. It refuses duplicates (already a partner, or a pending application). RLS `own_insert_reseller_applications` accepts only the caller's own pending, unreviewed row. Approval happens in the back office; the app never writes `partner_accounts`.
- **`/reseller-portal`** (noindex): each page calls `requirePartner(path)`, which redirects guests to sign in and then reads the caller's active `partner_accounts` row through RLS. Anyone who isn't an active partner sees a "Portal khusus partner" notice linking to `/reseller`.
  - *Ringkasan*: paid purchase total, paid and pending order counts, a 6-month bar chart (Asia/Jakarta months, with a screen-reader text per month) and the most-bought products. All figures come from the partner's own orders where `partner_type` is not null.
  - *Produk & Harga*: price list for their own type and level (`wholesale_prices` RLS). It shows retail price, partner price, minimum quantity, and the per-unit difference from retail (labelled "bukan jaminan keuntungan"). All levels sit in a `<details>` table. Add to cart uses the minimum quantity (`AddToCartButton` gained a `quantity` prop). A level whose minimum is above the cart's 99-per-line cap shows a "hubungi tim" note instead.
  - *Pesanan*: the partner orders, reusing `OrderList`.
  - *Asisten AI*: a CTA and quick-action chips that open the concierge.
- **Concierge partner mode:** only for a signed-in user on a `reseller` page whose active partner row the route has verified. `pageType` from the browser is a hint, not authority.
  - That user gets `PARTNER_TOOLS`, which adds `get_partner_prices` and `get_partner_sales_summary` to the customer tools. Both tools re-check the partner row on every call.
  - A partner note tells the model:
    - Prices come only from the tools.
    - The programme has no commission; never mention or compute commission, bonuses or income targets.
    - Promotional copy may use only approved product and knowledge text.
  - `tools.ts` now builds registries with `buildRegistry()`.
- **No migration.** Verified on the live DB inside a transaction that was rolled back:
  - A non-partner sees 0 wholesale prices, and an active reseller sees only the 8 reseller rows (not dropship).
  - A user can't insert an approved application, an application for another user, or their own partner account.
  - A pending application for themselves is accepted.
- **Owner items:**
  - Approve partners in the back office.
  - Level-4 minimum of 100 exceeds the cart's 99-per-line cap.
  - Approve the programme copy.

## Phase 13 summary

**Live programme data** (owner-managed; the storefront invents nothing):
- 1 tier, "Glow", from 0 points.
- 1 active rule: 1 point per Rp100 paid. The review, referral, birthday and signup rules exist but are inactive.
- **0 rewards.**
- `settings.loyalty`: 1 point = Rp1, redeemable up to 50%.

Points only change through the ledger functions: `mark_order_paid` / `post_loyalty_transaction` for earning, and `redeem_reward` / `place_order` / `release_order` for spending and refunds.

- **`/account/loyalty` "CNS Rewards"** (RLS):
  - Balance and lifetime points; tier and progress to the next tier.
  - How to earn (active rules, described from their own numbers) and the point value and redemption cap from settings.
  - Rewards with a confirm-then-redeem flow, or an empty state while there are none.
  - "Voucher & hadiahku", the customer's redemptions. Voucher codes come from `coupons`, looked up with the service role only for rows RLS already proved are theirs.
  - The customer's point history.
- **Redeem** (`redeemRewardAction` → `public.redeem_reward`, service role): the user id comes from the session. The function checks the balance and stock under a row lock, debits the points and issues a single-use 90-day coupon for discount or free-shipping rewards. Rejections are explained (insufficient balance, out of stock, unavailable).
- **Checkout redemption:**
  - The number of points is URL state, `?poin=N`, set by a GET form (next/form).
  - The page uses `min(N, balance)`, because asking for more makes `quote_cart` report `points_insufficient`.
  - It re-quotes with `p_points`; `quote_cart` also caps at `max_redeem_percent`, and the summary shows "Poin ditukar".
  - `placeOrderAction` re-quotes with the same points, compares the total, and passes the *applied* points to `place_order`, which debits them in the same transaction (`release_order` refunds them).
  - `CartQuote` now carries `pointsApplied` / `pointsDiscount`, and `quoteCart(cart, userId, points)` accepts points only for signed-in users.
- **Order page:** "Poin ditukar" is shown separately from coupon discounts (they used to be combined), and the points earned appear once payment is confirmed.
- **Concierge:** a new tool `get_my_loyalty` (signed-in only, RLS): balance, tier, next tier, point value, redemption cap and recent activity. The prompt says the balance comes only from this tool.
- **No migration.** Verified on the live DB inside a transaction that was rolled back: a customer can't insert ledger rows, create or raise a balance, insert redemptions, call `redeem_reward` directly, or read another customer's balance.

## Phase 12 summary

- **`/account/routine`** (signed-in; RLS through `own_all_user_routines` / `own_all_user_routine_items`):
  - Morning and evening lists ordered by `routine_steps`. "Both" items appear in each list.
  - Each item shows the product link, a stock note, how-to-use from the catalog, and any note.
  - Items are removable. A product that is no longer published shows as "sudah tidak tersedia".
  - **"Tambahkan rutinitas ke keranjang"** adds the active, in-stock products (reusing `addRoutineToCartAction`).
  - Beauty AI shortcut, and an empty state pointing to the Skin Quiz.
- **Builder:** add a step with a CNS product for it (the step's own products listed first) or "Produk yang sudah saya punya". Choose morning, evening or both (sunscreen is morning only), with an optional note. Duplicates are rejected, and the product must be published.
- **Quiz → routine:** "Simpan sebagai rutinitas saya" in the quiz result. The server recomputes the plan from the answers; a plan sent by the browser is never trusted. It replaces the routine's items, sets `source = 'ai'` (the recommendation engine) and links `ai_recommendation_id` to the logged run (`logRecommendation` now returns its id). Manual edits set `source = 'builder'`.
- **One routine per customer** is shown: the most recently updated `user_routines` row.
- **Concierge:** a new tool `get_my_profile_and_routine`, for signed-in customers only, reads their own skin profile and routine through RLS. The prompt uses it for personal advice and suggests the Skin Quiz when there's no profile.
- **No migration.** Verified on the live DB inside a transaction that was rolled back: a customer can create their own routine and items, but can't create, see, add items to, or delete another customer's routine.

## Phase 11 summary

- **`/skin-quiz`** (ISR, 5 min; indexable, with metadata and a canonical URL). A six-step wizard following PRD §19:
  1. Skin type, from `skin_types`, plus "Belum yakin".
  2. Main concerns (1–3), from visible `concerns`.
  3. Sensitivity.
  4. Current routine, from `routine_steps`.
  5. Desired results (a softer signal mapped to concerns).
  6. Budget.
- **Wizard behavior:**
  - Progress bar with `role=progressbar`.
  - Focus moves to each new question, and "Lanjut" stays disabled until the step is valid.
  - Progress lives in a Zustand store persisted to **sessionStorage** (`skipHydration` + `rehydrate()` on mount), so a guest who signs in to save comes back to the same result.
- **Scoring** (`src/services/quiz/scoring.ts`, `scoring_version = quiz-v1`, server-side via `submitSkinQuizAction`):
  - Rule-based, using the owner's `recommendation_weights` (staff-only table, read with the service role; documented defaults as fallback).
  - **Signals:** concern relevance from `product_concerns`, goals, skin-type mapping, whether the product fills a routine gap, budget and popularity.
  - Only products mapped to the customer's concerns are shown, at most 4.
  - **Claim governance:** reasons cite only the catalog's concern categories ("Termasuk kebutuhan: …"). Skin-type mappings, which currently list *all* types including "sensitive" for both products, influence the ranking but are never shown as "cocok/aman untuk" statements.
- **Output:**
  - A profile summary.
  - General care notes: patch test, a dermatologist for high sensitivity or acne, sunscreen. These are not a diagnosis.
  - Product cards with price and stock from the catalog.
  - An AM/PM routine built from `routine_steps` order and time.
  - **"Tambahkan rutinitas ke keranjang"**: active, in-stock products only, re-checked on the server.
  - Save profile, ask Beauty AI, and retake.
  - Empty and error states.
- **Persistence:**
  - Signed-in customers get `beauty_profiles` upserted through RLS (unique per user).
  - Every run is logged to `ai_recommendations` (service role): the snapshot, ranked products, routine and scoring version.
- **`/account/skin-profile`:** the saved profile (RLS) with retake and Beauty AI shortcuts. It's now in the account nav, and the dashboard links to the quiz.
- **No migration.**
- **Bug caught by E2E against the live API:** `products → routine_steps` has two relationships (the direct FK and `routine_products`), so the embed names `routine_steps!products_routine_step_id_fkey`.

## Phase 10 summary

Owner decisions (2026-09-30):
- **Re-review** knowledge that was "approved" without a reviewer.
- **Lexical retrieval first**; embeddings come later.
- **Apply** the chunking migration.

**Finding.** All 4 seeded `knowledge_documents` were `approved` with no `approved_by`. The product document repeated the unverified claims Phase 5 hid from the storefront ("aman untuk ibu hamil dan menyusui", "semua jenis kulit, termasuk sensitif", "anti-aging", "Skin Regeneration"), and "Tentang CNS Beauty" said "aman untuk berbagai jenis kulit, terdaftar dan diuji". Only 1 document had any chunks.

**Migration** `supabase/migrations/20260930004453_knowledge_governance_chunking.sql` (applied with owner approval on 2026-09-30):
- **Review guard** `private.knowledge_review_guard` (BEFORE INSERT/UPDATE):
  - Approving stamps `approved_by` / `approved_at`.
  - Editing an approved title or body resets the document to `pending_review`.
  - **Automation using the service key (`current_user = service_role`) cannot approve**: its approvals become `pending_review`. A person approves, either as an app admin (Phase 15) or the owner in the dashboard (SQL editor or table editor).
- **Chunking** `private.rebuild_knowledge_chunks` via the AFTER trigger `knowledge_documents_chunk_sync`:
  - Approved documents are split into paragraph chunks of about 800 characters, with the title prepended, whenever title, body or status change.
  - A document that stops being approved loses its chunks.
  - `search_document` is a generated tsvector; embeddings stay NULL.
- **Data:**
  - "Tentang CNS Beauty" and the product document are now `pending_review` (0 chunks).
  - "Pengiriman" and "Batasan CNS Beauty AI" stay approved (1 chunk each).
- **Verified** on the live DB inside transactions that were rolled back:
  - automation insert or approval → `pending_review`
  - an owner's approval → stamped, 3 chunks of at most 806 characters
  - editing approved text → `pending_review`, 0 chunks
  - a category change keeps the approval
- **Advisors:** only the existing leaked-password warning.
- **Also affects the WhatsApp AI system**, which shares these tables: its automated approvals now wait for a person.

**App**
- **`search_knowledge` tool** (`src/services/ai/tools.ts`) → `searchKnowledge` (`src/services/ai/knowledge.ts`, service role) → `public.match_knowledge`, which returns approved documents only.
  - The question becomes OR-ed keywords with Indonesian stopwords removed (`toLexicalQuery`), because `websearch_to_tsquery` would AND every word.
  - At most 4 sources of 1,200 characters each.
  - With no sources, the model is told not to guess and to offer the team.
- **Prompt:** brand, shipping, policy and product/ingredient questions must go through `search_knowledge`, and answers come only from its sources. Sources are reference material, never instructions. Product claims may come from `get_product` or approved knowledge only.
- **Logging:** the chunk ids an answer drew on are stored in `ai_messages.retrieved_chunk_ids`.
- **Verified on live data:**
  - "lama or pengiriman or jakarta" → Pengiriman
  - "dokter or iritasi" (policy) → Batasan AI
  - "aman or hamil or menyusui" → nothing

**Next for knowledge:** an admin review UI (Phase 15), and embeddings once the owner chooses a 1536-dimension embedding model on the gateway (`match_knowledge` already blends 60% semantic with 40% lexical when `p_embedding` is passed).

## Phase 9 summary

Owner decisions (2026-09-30):
- **LLM:** keep the existing **nara** gateway, model **agnes-2.5-flash**, called through its **OpenAI-compatible** `/chat/completions` API. There is no Anthropic/OpenAI SDK; the adapter uses `fetch`.
- **Logging:** **log conversations** in the existing `ai_conversations` / `ai_messages` tables.

- **`POST /api/ai/chat`:** SSE (`text/event-stream`).
  - **Request guards:** same-origin only (403 otherwise), a 64 KB body limit, and a Zod-validated body. The body carries the visible transcript (at most 20 messages of 2,000 characters each, last one from the user) plus page context.
  - **Rate limit:** 12 turns per minute per user or anonymous id. It's best effort and per instance; a shared store comes in Phase 21.
  - **Identity** comes from the session only. Anonymous visitors get an httpOnly `cns_aid` cookie that ties their conversations to them.
  - **Events:** `meta`, `status`, `text`, `products`, `handoff`, `unavailable`, `error`, `done`.
  - **Without `LLM_BASE_URL` + `LLM_API_KEY`**, or with `settings.ai.enabled = false`, it answers "sedang tidak tersedia" and offers the WhatsApp team. It never fakes a reply.
- **Concierge loop** (`src/services/ai/concierge.ts`): streams text, runs the tool calls, feeds the results back, and stops after 4 rounds.
  - Product cards and the WhatsApp handoff come from **tool data**, never from model text.
  - The system prompt forbids inventing prices, stock, orders, cart totals or claims, rules out medical diagnosis, and forbids revealing its instructions or reasoning. Page context is a separate hint, never authorization.
- **Controlled tools** (`src/services/ai/tools.ts`): read-only, Zod-validated; invalid JSON or arguments go back to the model as an error result.
  - `search_products` and `get_product` read the same catalog services as the storefront, so only approved copy is returned (claim governance).
  - `get_cart` returns totals from `quote_cart` only.
  - `get_order_status` requires sign-in and reads the order through RLS.
  - `request_human_help` returns the WhatsApp link from `settings.contact` and marks the conversation `escalated`.
- **Logging** (`src/services/ai/conversation.ts`, service role):
  - A conversation row: `agent = beauty_concierge`, `provider = nara`, the model, and `intake.page_type`.
  - One message row per user and assistant turn, with tokens and latency.
  - A conversation is reused only when it belongs to the caller. Logging failures never break a reply.
- **UI:** the concierge panel keeps its conversation in Zustand (AI state, separate from UI state), with:
  - streaming bubbles and a thinking/tool-status indicator (tool labels only, never reasoning)
  - recommendation cards and the WhatsApp handoff
  - Stop and New conversation buttons
  - an honest error fallback
  - `aria-busy` on the polite live log, so screen readers hear the finished reply rather than every token
- **Not yet:** RAG knowledge (Phase 10), and analytics events such as `AI_OPENED` / `AI_MESSAGE_SENT` (Phase 16).

## Phase 8 summary

- **Account area `/account`** (noindex). The layout holds the account nav and sign-out.
  - Every page calls `requireUser(next)`; signed-out visitors go to `/masuk?next=…`.
  - RLS authorizes every query; no user id is ever taken from the request.
- **Pages:**
  - **Ringkasan:** recent orders, the CNS Rewards balance read from `loyalty_accounts` (no row means 0 points), the wishlist count, and a Beauty AI entry.
  - **Pesanan:** paginated list, `?halaman=`.
  - **Order detail:** now inside the layout, with **"Pesan lagi"**.
  - **Wishlist.**
  - **Pengaturan:** profile form (RHF + Zod) and address book (add, delete, set default; at most 10 addresses).
  - Loyalty, Skin Profile and Routine are not linked until their phases.
- **Reorder** (`reorderAction`): puts the still-active products of the user's own order back in the cart. Current prices come from the quote, not the old order.
- **Wishlist:** a heart on the product page. Guests are sent to sign in, and the product page stays ISR because its state comes from `GET /api/wishlist` (private, no-store) through TanStack Query.
- **Profile:** updates only the columns `authenticated` holds UPDATE grants for (name, phone, WhatsApp, birth date, opt-ins); the email is read-only.
- **DB cart after login** (`src/services/cart/store.ts`, same `readCart`/`writeCart` API as before):
  - **Guests:** the httpOnly cookie, as before.
  - **Signed-in users:** `carts`/`cart_items` under RLS (`carts.user_id` is unique), so the cart works across devices and the WhatsApp context (`whatsapp_contact_context`) can see it.
  - **Writes** apply minimal row diffs (`diffCartRows`); new rows get `added_from = 'web'`.
  - **Read failures** throw `CartStoreError`, and pages show an error state. A failed read is never shown as an empty cart, and a write never works from a guessed empty cart.
  - **At sign-in, sign-up with a session, or the email callback**, `mergeGuestCart` adds the guest cookie cart to the account cart (the guest coupon wins) and clears the cookie. A failure keeps the guest cart and never blocks sign-in.
- **No migration:** the existing tables, RLS and column grants were enough. Verified on the live DB inside transactions that were rolled back:
  - A customer can't create or see another customer's cart, add items to it, write wishlists or addresses for others, or edit their own email.
  - Profile updates reach only the customer's own row.
- **Risk to watch:** `carts.recovery_sent_at` suggests an abandoned-cart flow outside this DB (e.g. WhatsApp). Signed-in web carts now appear in `carts`; confirm that the flow's messaging is intended before launch.

## Phase 7 summary

Owner decisions (2026-09-29): **manual bank transfer**, **login required for
checkout**, apply the payment-proofs migration.

- **Basic auth (Supabase email + password):**
  - Pages: `/masuk`, `/daftar` (RHF + Zod), `/auth/callback` (PKCE code exchange), and sign-out (`AccountStrip`, a plain form POST).
  - `safeNextPath()` only allows same-origin relative redirects.
  - Sign-up answers "check your email" for an already-registered address too, so the form can't be used to find out who has an account.
  - The account area itself comes in Phase 8.
- **`/checkout`** (dynamic, noindex; signed-out visitors are redirected to `/masuk?next=/checkout`). Linear per PRD §21:
  - Address: prefilled from `addresses`/`profiles` through RLS, optionally saved (duplicates skipped).
  - Shipping: fee from the quote; origin and handling time from `settings.shipping`.
  - Voucher: the coupon from the cart.
  - Payment: manual transfer.
  - Confirmation: notes, then "Buat Pesanan".
- **`placeOrderAction`:**
  - The user id and email come from `getClaims()`.
  - It re-quotes and compares the total with what the customer saw (→ `checkout_conflict`, and the page refreshes).
  - Then it calls `place_order` (service role), which reserves stock atomically. A P0001 error means `inventory_unavailable`.
  - It inserts a `payments` row (`provider = manual`, `method = bank_transfer`, `expires_at`), clears the cart and redirects to the order page.
- **`/account/orders/[orderNumber]`:** the owner reads it through RLS; another customer's number is a 404.
  - Shows status, deadline, bank accounts from `settings.payment`, items, totals, the address and the status history.
  - If no account is configured, it says the team will send payment details by WhatsApp. It never invents them.
- **Payment proof:** the browser uploads straight to the private `payment-proofs` bucket at `{uid}/{orderId}/…`, and the storage policy enforces it. The server then confirms the file exists and writes a history note (service role).
- **Expiry:** `/api/cron/expire-orders` (Vercel Cron, `Authorization: Bearer CRON_SECRET`, compared in constant time).
  - It calls `release_order(…, 'expired')` for **web** orders past `settings.payment.expiry_hours`.
  - It skips orders with an uploaded proof and never touches WhatsApp/admin orders.
  - `vercel.json` runs it daily (18:00 UTC) because of Hobby plan limits; on Pro, run it hourly.

**Migration** `supabase/migrations/20260929165224_payment_proofs_private.sql`
(applied with owner approval on 2026-09-29):
- **Bucket:** `payment-proofs` becomes private, with a 5 MB limit and jpeg/png/webp/pdf only. It held 0 objects before the change.
- **Storage policies:**
  - A customer may upload only into `{own uid}/{own pending_payment order}/`.
  - A customer may read only their own folder.
  - Staff (admin/owner) may read everything.
  - There is no update or delete.
- **Settings:** a new `settings.payment` row (public) = `{expiry_hours: 24, bank_accounts: [], note: null}`. The owner fills in `bank_accounts: [{bank, account_number, account_name}]`.
- **Verified** on the live DB inside transactions that were rolled back:
  - Allowed: uploading to your own pending order.
  - Denied: another user's order in your own folder, another user's folder, and an already-paid order.
  - Reads: a customer sees only their own files, and anon sees nothing.
- **Advisors:** only the existing leaked-password warning remains.

## Phase 6 summary

- **Guest cart:** the httpOnly cookie `cns_cart` (`src/services/cart/cookie.ts`)
  holds `{v: 1, items: [{p, v?, q}], coupon?}`: what the customer wants, never
  prices. It's SameSite=Lax, Secure in production, and lasts 30 days.
  - `parseCart()` validates with Zod. A tampered or outdated cookie becomes an empty cart, and duplicate lines are merged.
  - Limits: 20 lines, quantity 1–99.
  - DB carts (`carts.user_id` NOT NULL) need a signed-in user and take over after login in Phase 8.
- **Authoritative totals:** `quoteCart()` (`src/services/cart/quote.ts`, server-only)
  calls `public.quote_cart` with the service-role client.
  - `p_user_id` comes only from `getSessionUserId()` (Supabase `getClaims`), never from the browser.
  - The response is validated against a Zod contract (`quote-schema.ts`). The UI shows subtotal, discount, shipping, total and errors exactly as returned and computes nothing.
  - EXECUTE on `quote_cart` stays limited to postgres and service_role.
  - Without `SUPABASE_SERVICE_ROLE_KEY`, the cart still lists the lines but says the total can't be calculated yet (the `unavailable` state).
- **Mutations:** Server Actions in `src/features/cart/actions.ts`:
  - add: re-checks that the product is active and has stock through the public client
  - update quantity, remove
  - apply coupon: stored only if the quote accepts it
  - remove coupon

  Inputs are validated with Zod, and every action calls `revalidatePath("/cart")`.
- **`/cart`:** dynamic and noindex, with loading, empty, error, unavailable and ok states.
  - Per-line quote errors (out of stock, insufficient stock, minimum quantity…) appear in Indonesian.
  - Coupon form (`useActionState`).
  - Checkout was disabled until Phase 7; it now links to `/checkout` when the quote has no line errors, and WhatsApp stays available.
- **Header badge:** `CartLink` reads `GET /api/cart` (`{count}`, no-store)
  through TanStack Query (`QueryProvider` in the storefront layout), so
  marketing and product pages stay static/ISR.
- **Product page:** `AddToCartButton` is enabled for in-stock products (panel
  plus mobile sticky bar) and shows a disabled "Stok habis" otherwise. The
  result is announced through `role="status"`.

**`quote_cart` bug fix** (migration
`supabase/migrations/20260929162248_fix_quote_cart_unassigned_variant.sql`,
applied with owner approval on 2026-09-29):
- **Bug:** `quote_cart` failed with "record v_variant is not assigned yet" for
  every product without a variant, which is every product in the live catalog. So
  both the quote and `place_order` failed.
- **Fix:** the variant fields are stored in scalars (`v_variant_id`, `v_variant_name`, `v_variant_sku`). Pricing, coupon, loyalty and grant logic are unchanged.
- **Verified** on the live DB: a quote for a product without a variant returns
  `out_of_stock` for the current stock of 0. Advisors report no new findings.

## Phase 5 summary

- **`/produk/[slug]`:** prerendered for every active product
  (`generateStaticParams`), revalidated every 5 minutes, and a real 404 for
  unknown or inactive slugs. Page sections:
  - breadcrumb and gallery (scroll-snap on mobile, stacked on desktop, no JS, brand placeholder when there are no images)
  - name, short description, size, texture and BPOM (only when a number exists)
  - price and availability
  - Kandungan (approved ingredients with their approved benefit text, plus the full INCI list when present)
  - Cara Pakai (how to use, AM/PM, routine step)
  - Temukan Produk Serupa: concerns and skin types as catalog links, deliberately not "cocok untuk" (suitable for) claims
  - Ulasan (moderated reviews only, with an empty state) and Lengkapi Ritualmu (related products)
- **Purchase:**
  - Add to Cart was disabled until Phase 6 (now live, see above).
  - "Pesan / Tanya via WhatsApp" uses the public `settings.contact` number, a real channel (`order_source` includes `whatsapp`).
- **Mobile:** a sticky price and CTA bar sits above the safe area. The AI launcher moves up via `:root:has([data-sticky-commerce])`.
- **SEO:**
  - Product and BreadcrumbList JSON-LD: backend price in IDR and InStock/OutOfStock. Only factual copy goes into the description.
  - Canonical URL and Open Graph tags.
- **AI context:** `AIContextSetter` puts `{pageType: "product", productId, productSlug, productName, categoryId}` in `src/stores/ai-store.ts` (AI state, separate from UI state). The panel shows "Kamu sedang melihat …". It's context only, never authorization. Phase 9 sends it to the backend.

**Claim governance, in the database** (migration
`supabase/migrations/20260929155121_product_claim_governance.sql`, applied
to the live project with owner approval on 2026-09-29):
- **Why:** products.description / positioning, product_benefits and
  product_faqs were public but had no approval state, and they contained
  unverified claims ("semua jenis kulit, termasuk sensitif", "anti-aging",
  "Skin Regeneration", "aman untuk ibu hamil dan menyusui").
- **New columns:**
  - `product_benefits` and `product_faqs`: `review_status` (`content_status`, default `draft`), `evidence_reference`, `reviewed_by`, `reviewed_at`.
  - `products`: `copy_status`, `copy_evidence_reference`, `copy_reviewed_by`, `copy_reviewed_at`.
- **RLS:** the public can read benefits and FAQs only when they're `approved`.
  Staff policies are unchanged.
- **Triggers** (`private.claim_review_guard`, `private.product_copy_review_guard`):
  - Approving stamps who approved and when.
  - Editing approved text resets it to `pending_review`, so changed claims never stay approved.
  - Verified on the live DB inside a transaction that was rolled back.
- **Storefront:** `selectPublicCopy()` (`src/services/catalog/claims.ts`)
  shows description and positioning only when `copy_status = approved`, and
  re-checks `review_status` on benefits and FAQs.
- **State after the migration:** all 11 benefits, 2 FAQs and both products'
  copy are `draft`, so they're hidden until an admin approves them. The anon
  REST API now returns 0 benefits and 0 FAQs (it was 11 and 2).
- **Impact:** any other app reading these tables with the public key also
  sees only approved rows. No DB functions or views depended on them; only the
  search trigger reads `positioning`.
- **Approval flow until the admin UI (Phase 15):** an admin sets
  `review_status` / `copy_status` to `approved`, optionally with
  `evidence_reference`, in the Supabase dashboard.

## ADR-001: The live Supabase project is the schema source of truth (Phase 4)

- **Context:** the CNS Supabase project `CNS-Beauty-Skincare`
  (`unnnblkqzexvuachlbol`, ap-southeast-1) already had 18 migrations
  (2026-08-19 → 2026-09-18) and 68 tables. RLS is on everywhere, and it holds
  real catalog data: 2 active products with prices, 10 categories, 7 concerns,
  5 skin types, ingredients and knowledge documents. Its schema differs from
  the repo's `supabase/schema.sql`.
- **Decision:** build on the live schema. `supabase/schema.sql` is marked
  superseded. `src/types/database.ts` is generated from the live project and
  is the typed contract. Regenerate it after every migration.
- **Why:**
  - The live schema holds the real data.
  - Its RLS is stronger: staff actions go through `private.has_any_role()`, and public reads cover active products, approved ingredients, approved reviews, and consented + approved customer stories.
  - It already provides `search_catalog()` and tsvector search.
  - The §2 defects in `schema.sql` (self-role escalation, anonymous session leaks) don't exist here: roles live in `user_roles`, which only the owner can manage.
- **Consequences:**
  - Roles are `app_role` = customer / admin / owner, not the 6 roles in the brief. Content editor and customer service roles would need a migration.
  - There's no `product_claims` table (see Phase 5 blocker).
  - Migration SQL isn't in the repo yet. Fetch it with `supabase link` + `supabase migration fetch` (needs the DB password) before the first schema change from this repo.
- **Environment:** `.env.local` (gitignored) holds the URL and the publishable
  key "cnsbeatyskincare". No service-role key is needed for the public catalog.

## Phase 4 summary

- **Routes:**
  - `/produk`: all products, with search, filters, sort and pagination.
  - `/produk/kategori/[slug]`: one category. Unknown slugs return a real 404, because the listing's `loading.tsx` is scoped to a `(listing)` route group so it can't start streaming first.
- **URL state:** `q`, `kebutuhan` (concern), `kulit` (skin type), `harga`
  (price range), `urut` (sort) and `halaman` (page), parsed with Zod in
  `src/services/catalog/query.ts`. Invalid values are dropped, never errors.
  Filtered and searched views are `noindex`, and the base listing has a canonical URL.
- **Data layer** (`src/services/catalog/`):
  - `products.ts`: `listProducts`, `getFeaturedProducts`, `getCatalogFacets`, `getCategoryBySlug`. They use a cookie-less anonymous client (`src/lib/supabase/public.ts`), so RLS applies and pages stay cacheable.
  - `mapper.ts`: row → `ProductCardData`. Prices are passed through untouched.
  - `concerns.ts`: now queries real mapped concerns.
  - Search uses the existing `search_catalog()` RPC, ordered by relevance.
- **UI** (`src/features/catalog/`):
  - Filter panel made of links (works without JS and can be crawled).
  - Mobile filter drawer, sort select and search, both on `next/form` so they work without JS.
  - Category chips, active-filter chips, pagination.
  - Every state: loading skeleton, "Katalog sedang disiapkan" (not configured), error with retry, no results, success.
- **The homepage and `/manfaat` now use real data:** concern cards and featured
  products (`is_featured`). Both revalidate every 5 minutes (`revalidate = 300`).
- **Cards** show "Stok habis" when `stock = 0`, and hide ratings when there
  are no reviews.

**Data observations (for CNS Beauty):**
1. Both products have `stock = 0`, so both show "Stok habis".
2. **Product images are missing.** Storage buckets are empty, and the
   `/images/products/...` paths refer to files from an earlier site. Images only
   render from this project's public Storage (`resolveImageUrl`). Upload them to
   the `catalog` bucket and update the URLs.
3. **Security, before Phase 7:** the `payment-proofs` storage bucket is
   **public**, so payment receipts would be readable by URL. Make it private,
   with signed URLs.
4. **Security:** leaked-password protection is off (Supabase Auth setting).
5. The categories (Face Care, Body Care, Serum, Face Mist, Body Lotion,
   Sunscreen, Fragrance plus 3 collections) differ from the brief's IA (Facial
   Wash, Moisturizer…). The DB is followed.

**Phase 5 blocker, claim governance:** `product_benefits` (11 rows) are
public for active products but have **no approval status**. Some are claims
the brief says need evidence ("Menenangkan kulit sensitif", "Anti-Aging
Benefits", "Skin Regeneration"). The product detail page shouldn't show them
until an approval workflow exists: a status column plus an RLS change, or a
`product_claims` table.

## Phase 3 summary

- **`/tentang-kami`:** PageHero (title "CNS Beauty Skincare", subtitle "Ritual
  Cantik untuk Diri Sendiri", arch photo slot) → FounderStory (without the
  self-link) → "Makna Ritual" (six brand themes from PRD §12) → Brand values →
  Closing CTA.
- **`/manfaat`:** the four-step journey (PRD §13: concern → result → product →
  routine) → concern mapping (hidden until the catalog maps concerns) → Glow
  Routine three steps, described by product category only → AI / Skin Quiz
  CTA → non-medical disclaimer.
- **`/testimoni`:** published reviews only. Today that's an honest empty
  state, and the page is `noindex` while it has no reviews.
- **Shared pieces:**
  - `PageHero`, `ArchMedia` (moved from home) and `TestimonialList`.
  - Founder copy moved to `src/content/brand.ts`, shared by home and About.
  - Services `getPublishedTestimonials()` and `getMappedConcerns()`, shared by the homepage and these pages.
- **Founder story slot** (`BRAND_STORY.founder.story`) is empty on purpose.
  We don't write Wina Ranesa's personal story for her. Paragraphs added there
  appear on both pages.

**Copy needing approval:** the six "Makna Ritual" items and the Glow Routine
category descriptions are draft copy. The routine order (serum → moisturizer
→ face mist) comes from CNS Beauty's Glow Routine material.

**Still needed for a complete About page:** the founder-approved story, a
founder or brand portrait (`ABOUT_COPY.hero.image`), and approved testimonials.
Testimonial filters (product / concern / skin type, PRD §14) come with the
reviews data.

## Phase 2 summary

- **Homepage** (`src/app/(storefront)/page.tsx`), composed of sections in
  `src/features/home/` and ordered as in master prompt §6: Hero → Brand values
  → Shop by concern → Featured products → AI concierge → Founder story →
  Testimonials → Journal → Closing CTA.
- **Copy** lives in `src/content/home.ts`, not in components.
- **Data-driven sections** (concerns, featured products, testimonials,
  journal) get their data from `getHomePageData()`
  (`src/services/content/home-page.ts`). It returns empty lists until each
  source exists, and a section with no data doesn't render. The live homepage
  therefore shows no invented products, prices, reviews, articles or concern
  mappings. E2E asserts this, including that no "Rp" amount appears.
  `/design-system` previews these sections with labelled sample data.
- **Hero image slot** (`HOME_COPY.hero.image`) is `null`, so the arched frame
  shows a decorative botanical line drawing. Setting it to approved
  photography switches the frame to `next/image` with `priority`.
- **"Ask AI" entry points** (`AskAIButton`, `AskAIChip`) open the concierge
  with the question pre-filled but not sent. The draft lives in `ui-store`.
- **Motion:** CSS scroll-driven section reveals with no JS. The hero doesn't
  animate. See the motion doc.
- **New button variants** `inverse` / `inverse-outline` for dark surfaces.
- **Official logo** (`assets/CNS_logo_*.png`, added during Phase 2):
  - The header/footer mark is `public/brand/cns-logo-mark.png`: 384px and 46 KB, down from the 357 KB original. It's tinted brand cocoa through a CSS mask (`.cns-logo-mark`) and always set next to the "CNS Beauty / Skincare" wordmark, because the fine lines don't read at 44px.
  - `src/app/icon.png` (512) and `apple-icon.png` (180) come from the gold-on-black version, padded to a square.
  - The script in the mark reads **"cinesa"**. Its relationship to the "CNS Beauty" name should be confirmed.
  - A vector (SVG) master would render sharper than the PNGs.

**Copy that needs CNS Beauty approval before launch:**
1. The hero body says "…dengan **formula terbaik**…" (from master prompt §6).
   "Terbaik" (best) is a superlative that should have support, or be softened
   to the PRD wording: "Perawatan kulit berkualitas untuk membantu kulit terasa
   lebih bersih, halus, lembut, cerah dan wangi."
2. The four brand-value descriptions are draft value statements I wrote. They
   aren't product claims.

## Phase 1 summary

- **UI primitives** (`src/components/ui`): Button/ButtonLink, IconButton/IconLink,
  Input, Textarea, Select, Checkbox, RadioGroup, Badge, Card, Skeleton,
  LoadingState, EmptyState, ErrorState, and Dialog → Modal / Drawer / Sheet
  (native `<dialog>`).
- **Layout** (`src/components/layout`): Container, Logo (typographic
  placeholder until the SVG arrives), AnnouncementBar (config-driven, empty by
  default), SiteHeader (sticky; desktop nav plus actions, mobile menu/logo/cart),
  MobileNav drawer, SiteFooter.
- **AI** (`src/components/ai`): AILauncher (floating), AIPanel (floating
  non-modal on desktop, full-screen modal on mobile), AIMessage, AIInput,
  AIHeaderButton. Messages use a `role="log"` polite live region. Until Phase 9
  every reply is an explicit "not yet available" notice plus a human handoff link.
  Nothing is invented.
- **Product** (`src/components/product`): ProductCard (stretched link, action
  slot, desktop-only hover zoom), ProductCardSkeleton, ProductGrid (2/3/4/5
  columns, empty state), Price (display only), Rating (hidden when there are
  no reviews).
- **Route group** `src/app/(storefront)` carries the shell. `/design-system` is
  an internal, noindexed preview, served in production only with
  `ENABLE_DESIGN_PREVIEW=true`. All data on it is labelled sample data.
- **State:** `src/stores/ui-store.ts` (Zustand) holds only AI-panel UI state.
- **Config** (`src/config`): nav, footer, announcements, social links and AI
  quick actions. Announcements and social links are empty until approved content exists.
- **Motion:** `docs/CNS_BEAUTY_MOTION_SYSTEM.md` (new). `motion` is deferred to Phase 2.

Fixed during Phase 1 validation: class conflicts passed through `className`
(e.g. `hidden` against a component's `inline-flex`) made desktop-only header
icons render on mobile. The page became 583px wide, so the browser zoomed out.
Rule, now documented in `src/lib/utils/cn.ts`: never pass a conflicting utility
to a component; use a variant prop or a wrapper element. The E2E suite now
checks that the layout viewport equals the device width.

---

## 1. Gap analysis (baseline before Phase 0)

The repository contained **specifications only**: no application code, no
`package.json`, no git history.

| Area | Found | Gap |
|---|---|---|
| Architecture | `CLAUDE.md`, PRD, frontend spec, design system, repo-structure docs | No code |
| Pages | None | All 60+ routes in the IA |
| Components | None | Entire UI and beauty/AI component set |
| Database | `supabase/schema.sql` baseline (34 tables, RLS on every table) | Not applied, no migrations, no Supabase project linked, **security defects (§2)** |
| Authentication | None | Supabase Auth, roles, route protection |
| AI | None | Provider choice, gateway, RAG, tools, streaming UI |
| Assets | 6 images in `assets/` | **None production-ready (§3)** |
| Testing / CI | None | Unit, integration, E2E, CI pipeline |

## 2. Database review: fix before applying `schema.sql`

`schema.sql` is a good baseline, but it must not be applied as-is:

1. **Critical: privilege escalation.** The policy `"users can update own profile"`
   lets a user update their own row, **including `role`**. Any customer
   could set `role = 'admin'`. Fix: exclude `role`/`is_active` from
   user updates (column privileges or a trigger) and store roles server-side only.
2. **High: anonymous data leak.** The `ai_conversations`/`ai_messages` SELECT
   policies and the `skin_quiz_sessions` ALL policy allow `user_id is null`,
   so any visitor can read (and, for quiz sessions, modify) **every** anonymous
   session. Anonymous access must go through server routes keyed by a
   session id.
3. **High: no knowledge publishing state.** `knowledge_documents` has only
   `is_active`, so the rule "only PUBLISHED knowledge in production retrieval"
   cannot be enforced. Needs a status lifecycle, chunks and embeddings
   (pgvector) for RAG.
4. **Medium (fixed in Phase 16):** `analytics_events` accepts arbitrary anonymous inserts. Route
   ingestion through a server endpoint.
5. **Medium:** `is_admin()`/`is_reseller()` are `SECURITY DEFINER` in the
   exposed `public` schema. Move them to a private schema.
6. **Medium:** `loyalty_accounts.points_balance` isn't derived from the
   ledger. Mutations need a transactional RPC.
7. **Low (performance):** policies use `auth.uid()` directly. Wrap it as
   `(select auth.uid())`. `updated_at` has no triggers. There is no
   profile-on-signup trigger.
8. **Missing tables** from the PRD/master prompt: `vouchers`, `campaigns` /
   announcement config, `reseller_commissions`, `testimonials`, knowledge chunks.
   The `content_editor` and `customer_service` roles appear in no policy.

**Recommendation:** add a "DB hardening" migration step at the start of
Phase 4, when the catalog first needs the database. Apply it to a local or branch
database with `supabase db advisors` before anything touches production.

## 3. Asset review

| File | Content | Usable? |
|---|---|---|
| `Website CNS Beauty Skincare.png` | AI-rendered homepage concept | **Visual reference only.** Shows products that aren't in the known range (Facial Cleanser, Toner, Day/Night Cream, Glow Serum) and unverified claims |
| `Serum - Face Mist - LIcore.jpeg` | "Glow Routine" flyer: Serum DNA Salmon, Licore Moisturizer, Brightening Face Mist | Reference for product names and routine order. Claims baked into the image (BPOM, "aman untuk semua jenis kulit", "hasil nyata & terbukti") |
| `Licorice Moisturaiser .jpeg` | Licorice Moisturizer flyer | Reference only. Claims baked in |
| `Tentang CNS.jpeg` | Despite the filename, a **Licorice Moisturizer infographic** (ingredients, "+92% in 14 days", BPOM/dermatologically tested/cruelty free) | Reference only. Every claim needs evidence |
| `Model CNS.jpeg` | Casual phone selfie, rotated, domestic background | **No:** not hero quality |
| `Starbuck Time.png` | Lifestyle photo with prominent Starbucks trademarks | **No:** third-party trademarks |

Still needed from CNS Beauty: vector logo, clean product cutouts and
photography, founder portrait, product master (names, sizes, prices, SKUs,
ingredients, usage), claim evidence, approved testimonials, and official brand
colors. The packaging also shows a sub-brand mark (reads like "cincya") whose
relationship to "CNS Beauty" should be confirmed.

## 4. Decisions made in Phase 0

| Decision | Choice | Reason |
|---|---|---|
| Source layout | `src/` (master prompt §25), not root `app/` (REPOSITORY_STRUCTURE.md) | Master prompt is the later instruction |
| Color system | Core semantic tokens from `CLAUDE.md` **plus** a provisional `brand-*` accent layer from `DESIGN_SYSTEM.md` | The two docs conflict. The core set is mandated; the warm accents are needed for the blush/cream direction. See `DESIGN_TOKENS.md` |
| Token enforcement | Tailwind defaults reset, so only CNS tokens generate utilities | Stops arbitrary palette drift |
| Breakpoint names | `tablet` 640, `desktop` 1024, `wide` 1440 | Match CLAUDE.md §11 tiers |
| URLs | Indonesian for public SEO pages (`/produk/[slug]`, `/produk/kategori/[slug]`, `/artikel/[slug]`, `/tentang-kami`); English for authenticated areas | Master prompt §22 plus the PRD IA |
| Reseller | Public program page `/reseller`; portal `/reseller-portal/*` | The repo-structure doc put both at `/reseller` |
| Supabase keys | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser), `SUPABASE_SERVICE_ROLE_KEY` (server) | Current Supabase guidance plus CLAUDE.md naming |
| Session auth | `getClaims()` in `src/proxy.ts` (Next 16 renamed middleware to proxy) | `getSession()` isn't safe on the server |
| Env validation | Zod. The build fails if a secret or service-role key is placed in a `NEXT_PUBLIC_` variable | Secret exposure is the top security rule |
| Node | `>=22`, `@types/node` 24 | Supabase drops Node 20 (June 2026) |
| Typed routes | Deferred until pages exist | The `typedRoutes` check would reject routes not built yet |

## 5. Code map

```text
src/
├── app/
│   ├── layout.tsx          fonts (Cormorant Garamond, Inter), lang="id", skip link, metadata
│   ├── globals.css         design tokens (single source of truth)
│   ├── page.tsx            Phase 0 placeholder, replaced in Phase 2
│   ├── not-found.tsx       branded 404
│   ├── error.tsx           route error boundary
│   └── api/health/route.ts liveness plus "is Supabase configured" (no secrets)
├── constants/routes.ts     canonical route map plus slug helpers
├── lib/env/                Zod env: schema.ts (pure), client.ts (public), server.ts (server-only)
├── lib/supabase/           client.ts (browser), server.ts (RSC/actions), admin.ts (service role, server-only), proxy.ts
└── proxy.ts                session refresh on every non-asset request
tests/
├── unit/                   env guard, route helpers (Vitest)
└── e2e/                    foundation checks on desktop and mobile (Playwright, production build)
supabase/
├── config.toml             local stack config (not linked to a remote project)
└── schema.sql              baseline, NOT applied, see §2
```

Dependency direction: `app → features/components → services → lib → external`.
`server-only` guards `lib/env/server.ts`, `lib/supabase/server.ts` and
`lib/supabase/admin.ts`.

## 6. Recommended sequence and prerequisites

Follow master prompt §26, with these gates:

| Before phase | Needed from CNS Beauty / decision |
|---|---|
| 1 Design System | Done. Logo integrated in Phase 2 (PNG). Still wanted: SVG master, confirmation of the color layering in §4 |
| 3 About / Brand | Founder portrait, full approved founder story, brand values sign-off |
| 2 Homepage | Hero photography (model plus products); approved hero/benefit copy; testimonials, if any |
| 4 Catalog | **Product master data**; Supabase project; DB hardening migration (§2) |
| 7 Checkout | Payment provider (e.g. Midtrans/Xendit) and shipping provider |
| 9 AI Concierge | LLM provider and data-processing terms |
| 10 RAG | Approved knowledge sources |

## 7. Validation log

| Phase | lint | typecheck | unit | build | e2e |
|---|---|---|---|---|---|
| 0 | pass | pass | 14/14 | pass | 11 pass, 1 skipped (keyboard test runs desktop-only) |
| 1 | pass | pass | 22/22 | pass | 40 pass, 6 skipped (device-specific), including axe WCAG 2.2 AA on 4 views × 2 devices |
| 2 | pass | pass | 23/23 | pass | 56 pass, 6 skipped (device-specific) |
| 3 | pass | pass | 23/23 | pass | 79 pass, 7 skipped (device-specific) |
| 4 | pass | pass | 38/38 | pass | 101 pass, 9 skipped (device-specific). Catalog E2E runs against the live public catalog; stable across 2 runs |
| 5 | pass | pass | 43/43 | pass | 118 pass, 10 skipped (device-specific) |
| 6 | pass | pass | 58/58 | pass | 132 pass, 12 skipped (device-specific; coupon test waits for the service-role key). Includes axe on `/cart` (empty and with a line) |
| 7 | pass | pass | 75/75 (incl. checkout action integration tests) | pass | 152 pass, 12 skipped (device-specific; coupon test waits for the service-role key). Signed-out/validation paths only; no accounts are created on live Auth |
| 8 | pass | pass | 89/89 (incl. cart-store and reorder integration tests) | pass | 169 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Signed-out paths only |
| 9 | pass | pass | 105/105 (incl. concierge loop + controlled-tool integration tests) | pass | 177 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Chat UI tested against a mocked SSE stream; the live model is never called from E2E |
| 10 | pass | pass | 109/109 (incl. knowledge retrieval tests) | pass | 177 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Knowledge guard/chunking verified on the live DB in rolled-back transactions |
| 11 | pass | pass | 122/122 (incl. scoring + quiz action tests) | pass | 187 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Quiz E2E runs against the live catalog, incl. axe on quiz and results |
| 12 | pass | pass | 133/133 (incl. routine model, routine actions, profile/routine AI tool) | pass | 189 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Signed-in routine flows covered by integration tests + live RLS check |
| 13 | pass | pass | 145/145 (incl. loyalty model, redeem action, checkout points, loyalty AI tool) | pass | 191 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Ledger lockdown verified on the live DB |
| 14 | pass | pass | 161/161 (incl. reseller model, application action, partner AI tools) | pass | 207 pass, 13 skipped (device-specific; coupon test waits for the service-role key). Signed-out paths + axe on `/reseller`; partner RLS verified on the live DB |
| 15 | pass | pass | 182/182 (incl. admin model, admin action authorization/audit integration) | pass | 231 pass, 13 skipped; 4 failed on `ConnectTimeoutError` / slow responses from the live Supabase during the run (cart/catalog specs untouched by Phase 15; they passed in the previous run and in isolation). All 28 new admin E2E pass (14 tests × 2 devices) |
| 16 | pass | pass | 209/209 (incl. analytics model/contract, ingest route, server recorder, event emitters in checkout/quiz/reorder) | pass | 251 pass, 13 skipped, 0 failed (incl. 14 new analytics E2E + privacy page a11y) |
| 17 | pass | pass | 251/251 (incl. conversation persistence, hydration gate, owner key, image filter, session state, rail model, concierge page type) | pass | 266 pass, 16 skipped, 0 failed (incl. 16 concierge-page E2E: inline stream, reload/panel continuity, one chat surface, rail chips, composer above the fold, mobile/desktop layout, no-JS content, axe) |
| 18 | pass | pass | 268/268 (incl. trend model, cron auth, retention cron route integration) | pass | 262 pass, 16 skipped; 4 `layout.spec` design-preview specs failed only because the manually started server lacked `ENABLE_DESIGN_PREVIEW=true` (Playwright's own webServer sets it); rerun with it: `layout.spec` 27 pass. Incl. privacy-page retention sentence + axe. SQL verified on live in rolled-back transactions (6 checks + RLS) |
| 19 | pass | pass | 287/287 (incl. robots/sitemap/JSON-LD builders, sitemap + FAQ readers) | pass | 281 pass, 16 skipped; 3 failed on test expectations (header spec still listed Artikel; home canonical is the bare origin), both fixed → `seo.spec` + `layout.spec` 45 pass. Screenshots: `/faq`, `/kontak`, share card |
| 20 | pass | pass | 301/301 (incl. env-public guards, scheduleAfterLoadIdle, unchanged protocol/persistence/env tests) | pass | 298 pass, 16 skipped, 0 failed (incl. 12 performance-budget E2E). Lighthouse before/after in the Phase 20 summary |
