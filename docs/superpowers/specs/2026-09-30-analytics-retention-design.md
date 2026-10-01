# Phase 18: Analytics Retention and Daily Totals — Design

- **Date:** 2026-09-30
- **Status:** approved in brainstorming, awaiting spec review
- **Scope source:** `docs/ARCHITECTURE.md` Phase 16 "Not yet: Retention/aggregation of raw events (Phase 18)"; CLAUDE.md §14 (events must be anonymous-safe, PII-minimised and versioned)
- **Branch:** `feat/phase-18-analytics-retention` (from `main` at `9fd1330`)

## 1. Goal

Limit how long per-visitor analytics events are kept, and keep long-term trends that contain no identifiers:

- delete raw rows in `analytics_events` older than **180 days**;
- before deleting, roll events up into **anonymous daily totals per event name**, and keep those totals indefinitely;
- show those totals to staff in a **trend section** on `/admin/analytics`;
- state the retention period on the privacy page.

### Owner decisions (2026-09-30)

| Question | Decision |
|---|---|
| Goal | Privacy limit plus long-term trends (not performance-driven) |
| Raw retention | 180 days (the 90-day reports plus a previous 90 days for comparison) |
| Long-term totals | Events per day only: event count and unique visitors that day, per event name |
| Admin view | Trend section with a 3/6/12-month range: a weekly line chart and a monthly table |
| Job mechanism | SQL function triggered daily by a Vercel cron route (not `pg_cron`, not a TypeScript aggregation) |

### Context (live project `unnnblkqzexvuachlbol`, 2026-09-30)

- `analytics_events` holds 36 rows (the migrated legacy events, 2026-09-18 to 2026-09-19), 192 kB in total. The site hasn't launched, so volume isn't the driver.
- `pg_cron` isn't installed.
- Staff read `analytics_events` through the policy `staff_select_analytics_events` (`private.has_any_role(array['admin'])`).
- The report functions `analytics_funnel` and `analytics_event_counts` read raw events for windows of up to 90 days. Raw data younger than 90 days must never be deleted.

### Out of scope

- Long-term visit sources, search terms and daily funnels.
- A shared rate-limit store (Phase 21).
- `pg_cron`.
- Any change to the existing 7/30/90-day reports.

## 2. Database (one migration)

File: `supabase/migrations/<timestamp>_analytics_retention.sql`.

### Table `public.analytics_daily_events`

| Column | Type | Meaning |
|---|---|---|
| `day` | `date not null` | calendar day in `Asia/Jakarta` (WIB) |
| `event_name` | `text not null` | same `CHECK` list as `analytics_events.event_name` |
| `events` | `integer not null` | events that day |
| `visitors` | `integer not null` | `count(distinct coalesce(anonymous_id, user_id::text))` that day; events with neither id (DNT/GPC server events) count in `events` only |
| `updated_at` | `timestamptz not null default now()` | last recompute |

- **Key:** primary key `(day, event_name)`.
- **No identifiers of any kind.**
- **Access:** RLS enabled. One policy, `staff_select_analytics_daily_events`, gives `SELECT` to `authenticated` using `(select private.has_any_role(array['admin'::app_role]))`. `revoke all` from `anon` and `authenticated`, then `grant select` to `authenticated`. Only the service role writes.

### Function `public.analytics_rollup_and_purge(p_retention_days integer default 180)`

It returns `table (days_rolled_up integer, rows_upserted integer, rows_deleted integer)`. It is `SECURITY DEFINER` with `set search_path = ''`. Execute is revoked from `public`, `anon` and `authenticated`, and granted to `service_role` only.

1. **Guard:** `p_retention_days < 90` raises an exception, so the 90-day reports can never lose data.
2. **Window:**
   - `yesterday` = `(now() at time zone 'Asia/Jakarta')::date - 1`.
   - `from_day` = `max(day) - 2` from `analytics_daily_events`, a 2-day overlap for late or delayed inserts.
   - When the table is empty, `from_day` = the WIB day of the oldest raw event (backfill).
   - `purge_before` = `(now() at time zone 'Asia/Jakarta')::date - p_retention_days`. The overlap start (`max(day) - 2`) is clamped to at least `purge_before`, so a day that may already be purged is never recomputed from what's left of it. The first-run backfill isn't clamped: nothing has been purged yet, so every day is complete.
   - Nothing is rolled up when `from_day > yesterday` or there are no raw events.
   - Today is never rolled up.
3. **Rollup:** for WIB days `from_day..yesterday`, group raw events by `((created_at at time zone 'Asia/Jakarta')::date, event_name)` and upsert with `on conflict (day, event_name) do update set events, visitors, updated_at = now()`. Re-running produces identical totals.
4. **Purge (whole WIB days only):** delete raw events whose WIB day is `< purge_before` **and** has at least one row in `analytics_daily_events`.
   - A day is either fully present or fully gone, never half-deleted.
   - It deletes in batches of 10,000 rows (by `id`) and repeats while a batch is full, up to 100 batches per run.
   - The rollup runs before the purge in the same call. On the first run (empty totals) the backfill covers every day, so no raw day is deleted before it has totals.
   - A raw row on an old day that somehow has no totals is never deleted. The app can't create one, since `created_at` defaults to `now()`.

The existing index `analytics_events_time_name_idx (created_at desc, event_name)` serves both the per-day scan and the age-based delete, so no new index is needed.

## 3. Cron route

- **Shared helper:** `src/lib/auth/cron.ts` exports `authorized(header: string | null, secret: string): boolean`. It is moved as is from `src/app/api/cron/expire-orders/route.ts`: a constant-time comparison against `Bearer <secret>`. `expire-orders` imports it.
- **Route:** `src/app/api/cron/analytics-retention/route.ts`, `GET`, `dynamic = "force-dynamic"`.
  - It returns 503 `{ error: "not_configured" }` without `CRON_SECRET` or `SUPABASE_SERVICE_ROLE_KEY`, and 401 `{ error: "unauthorized" }` unless the header matches.
  - It calls `createAdminClient().rpc("analytics_rollup_and_purge", { p_retention_days: 180 })`.
  - **Success:** 200 `{ daysRolledUp, rowsUpserted, rowsDeleted }`, and one `console.info("[analytics-retention]", counts)`.
  - **RPC error:** it logs `console.error` and returns 500 `{ error: "failed" }`. The next night's run catches up.
- **Schedule:** `vercel.json` gets `{ "path": "/api/cron/analytics-retention", "schedule": "30 18 * * *" }` (01:30 WIB). There are two cron jobs in total, within the Vercel Hobby limit.
- **Constant:** `ANALYTICS_RETENTION_DAYS = 180` in `src/constants/analytics.ts`. The route and the privacy page copy both use it.

## 4. Admin trend section

- **Service:** `getAnalyticsTrend(months: 3 | 6 | 12)` in `src/services/admin/analytics.ts`.
  - It reads `analytics_daily_events` (`day, event_name, events, visitors`) with the staff user's server client (RLS), for `day >= first day of (WIB today − months)` and `day <= yesterday`.
  - It returns `{ status: "ok"; trend: Trend } | { status: "error" }`.
- **Pure model:** `buildTrend(rows, { from, to })` in `src/services/analytics/trend.ts`, which is unit-tested.
  - `weeks: { weekStart: string; pageVisitors: number; orderVisitors: number }[]`
    - Monday-start weeks, covering every week in the range. Missing weeks are 0.
    - `pageVisitors` is the sum of daily `PAGE_VIEWED` visitors; `orderVisitors` is the sum of daily `ORDER_CREATED` visitors.
  - `months: { month: string; events: Partial<Record<AnalyticsEventName, number>>; conversion: number | null }[]`
    - `conversion` = summed `ORDER_CREATED` visitors ÷ summed `PAGE_VIEWED` visitors, or `null` when the denominator is 0.
  - Rows outside `from..to` are ignored.
- **UI:** a new `src/features/admin/trend-chart.tsx`, a server component:
  - **Range links:** `?tren=3|6|12`, default 6, in the same link style as the `?hari=` selector. Both parameters are kept when switching either one.
  - **Chart:** an inline SVG with two polylines (`brand-cocoa` for page-view visitors, `ai-accent` for order visitors), a legend, a 0 baseline, and a y-axis maximum label. It has `role="img"` and an `aria-label` summary, such as "Tren mingguan 6 bulan: pengunjung halaman dari X ke Y, pengunjung yang memesan dari A ke B." No chart library.
  - **Monthly table:** a caption, a row per month, columns for Kunjungan (`PAGE_VIEWED` visitors), Produk dilihat, Tambah ke keranjang, Checkout, Pesanan, and Konversi.
  - **Caption text:** "Pengunjung dihitung per hari lalu dijumlah; satu orang yang datang 3 hari terhitung 3. Data sampai kemarin."
- **States:**
  - Loading: the section streams behind `<Suspense>` with a skeleton, so the existing reports never wait.
  - Empty: no rows gives "Ringkasan harian tersedia setelah proses malam pertama."
  - Error: the existing `InsightError`.
- **Placement:** below the existing reports on `src/app/admin/analytics/page.tsx`.

## 5. Privacy page

`src/app/(storefront)/kebijakan-privasi/page.tsx`, Analytics list, gets a new bullet:

> Data kejadian mentah disimpan paling lama {ANALYTICS_RETENTION_DAYS} hari. Setelah itu kami hanya menyimpan jumlah harian tanpa ID apa pun.

The owner's legal review, already pending since Phase 16, still applies.

## 6. Testing and validation

### Unit tests (Vitest)

- `tests/unit/analytics-trend.test.ts` for `buildTrend`:
  - week grouping, where a Sunday row belongs to the previous Monday's week;
  - zero-filled weeks;
  - monthly sums;
  - `conversion` is null with no page visitors;
  - out-of-range rows are ignored.
- `tests/unit/cron-auth.test.ts`: `authorized` accepts the exact token, and rejects a wrong, missing, or different-length one.

### Integration tests

`tests/integration/analytics-retention-cron.test.ts`, mocking `@/lib/env/server` and `@/lib/supabase/admin`:

- 503 when not configured;
- 401 on a wrong secret;
- 200 calls the RPC with `{ p_retention_days: 180 }` and maps its counts;
- 500 on an RPC error.

The existing `expire-orders` tests, if any, still pass.

### Database (live project, one transaction rolled back)

1. Synthetic events on 3 WIB days, including 23:59 WIB, land in the right `day` with the right `events` and `visitors`.
2. A second run gives identical totals.
3. First run with an empty totals table and an event 200 days old: the run writes that day's totals, then deletes the event.
4. Events 181 days old and 179 days old: after a run, only the 181-day-old one is gone, deleted as a whole WIB day. A later run doesn't change the totals of the purged day.
5. `analytics_rollup_and_purge(30)` raises an error.
6. `anon` and a customer can't select `analytics_daily_events` or execute the function; an admin can select.

Then the Supabase security advisors show nothing new.

### E2E

The privacy page contains the 180-day sentence, and its existing axe check still passes. The admin trend section isn't covered in E2E (the suite never signs in).

### Validation

`npm run validate` and the full Playwright suite. Results go in `docs/ARCHITECTURE.md` "Phase 18 summary" and its validation row; `docs/IMPLEMENTATION_CHECKLIST.md` gets a line.

## 7. Rollout

1. **Apply the migration** to the live project after the owner confirms. It is an outward action.
2. **`CRON_SECRET`** is already set for `expire-orders`, so nothing new is needed in Vercel.
3. **The first nightly run** backfills totals for the existing events and deletes nothing, since the oldest event is from 2026-09-18.

## 8. Risks

- **The weekly "visitors" figure overcounts repeat visitors.** Mitigation: the chart caption says so, and unique-person counts stay in the 180-day raw reports.
- **A missed cron run.** Mitigation: the rollup window starts 2 days before the latest totals and backfills any gap, and the purge only deletes whole days that already have totals.
- **Partial-day recompute.** Mitigation: the purge works in whole WIB days, and the overlap recompute never reaches back past the purge boundary.
- **A large delete after long downtime.** Mitigation: batches of 10,000, and at most 100 batches per run.
- **Time zone.** Days are WIB, while the existing 7/30/90-day reports use a rolling window (`now − N days`). The two views can differ slightly at the edges; the caption says the trend runs "sampai kemarin" (up to yesterday).
