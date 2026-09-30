# Analytics Retention and Daily Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete raw analytics events after 180 days, whole WIB days at a time. Keep anonymous daily totals per event indefinitely, show them to staff as a 3/6/12-month trend, and state the limit on the privacy page.

**Architecture:**
- One SQL function, `analytics_rollup_and_purge`, runs as `SECURITY DEFINER` with execute granted to the service role only. It upserts daily totals into a new identifier-free table, `analytics_daily_events`, and then deletes whole WIB days older than the retention period.
- A Vercel cron route calls it nightly, reusing the `CRON_SECRET` check, which moves into `src/lib/auth/cron.ts`.
- The admin page reads the totals through staff RLS. A pure `buildTrend` shapes them into weekly points and a monthly table, which render as an inline SVG and an HTML table.

**Tech Stack:** Next.js 16 route handlers and Server Components, Supabase Postgres 17 (plpgsql), Vitest (node environment, integration tests with mocked Supabase), Playwright, Supabase MCP (`execute_sql`, `apply_migration`, `generate_typescript_types`, `get_advisors`).

**Spec:** `docs/superpowers/specs/2026-09-30-analytics-retention-design.md`

## Global Constraints

- Retention is exactly `ANALYTICS_RETENTION_DAYS = 180`. The SQL guard rejects anything below 90.
- Days are `Asia/Jakarta` (WIB) calendar days. The purge deletes whole WIB days only, and never a day without a totals row.
- `analytics_daily_events` holds no identifiers: `day`, `event_name`, `events`, `visitors`, `updated_at` only.
- Only the service role executes the function or writes totals. Staff read totals through `private.has_any_role(array['admin']::public.app_role[])`.
- No new dependencies: no chart library, and no `pg_cron`.
- Live project `unnnblkqzexvuachlbol`. **Task 3 (apply to live) needs the owner's explicit go-ahead in chat before it runs.**
- `src/types/database.ts` is generated. Never hand-edit it; regenerate it after applying.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A partial day recomputed after a purge.** If a WIB day had some raw rows deleted and was then rolled up again, its totals would shrink. The purge must be whole-day, and the overlap recompute must be clamped to `purge_before`. Pinned in Task 2, DB check 4.
2. **Old events on the first run.** Events already older than 180 days when the migration first runs must get totals before they are deleted: the backfill is unclamped. Pinned in Task 2, DB check 3.
3. **Visitors counted across WIB midnight.** An event at 23:59 WIB and one at 00:01 WIB belong to different days even though their UTC dates match. Pinned in Task 2, DB check 1.
4. **Sunday rows and empty weeks in the chart.** A Sunday belongs to the Monday-start week before it, and weeks with no data show as 0, not as a gap. Pinned in Task 5 (`buildTrend`).
5. **The cron route with a missing or wrong secret, or an RPC failure.** These must never return 200, and never run the purge without authorization. Pinned in Task 1 (`authorized`) and Task 4 (route tests).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/auth/cron.ts` (new) | `authorized(header, secret)` constant-time bearer check |
| `src/app/api/cron/expire-orders/route.ts` | imports `authorized` instead of its local copy |
| `supabase/migrations/20261001010000_analytics_retention.sql` (new) | table, RLS, grants, function |
| `src/types/database.ts` | regenerated after applying |
| `src/constants/analytics.ts` | `ANALYTICS_RETENTION_DAYS` |
| `src/app/api/cron/analytics-retention/route.ts` (new) | nightly trigger |
| `vercel.json` | second cron entry |
| `src/services/analytics/trend.ts` (new) | pure: `TREND_RANGES`, `parseTrendRange`, `trendRange`, `wibToday`, `buildTrend` |
| `src/services/admin/analytics.ts` | `getAnalyticsTrend(months)` |
| `src/features/admin/trend-chart.tsx` (new) | SVG chart, monthly table, empty state, skeleton |
| `src/app/admin/analytics/page.tsx` | `?tren=` selector, trend section behind `<Suspense>` |
| `src/app/(storefront)/kebijakan-privasi/page.tsx` | retention bullet |
| `tests/unit/cron-auth.test.ts`, `tests/unit/analytics-trend.test.ts`, `tests/integration/analytics-retention-cron.test.ts` (new), `tests/e2e/analytics.spec.ts` | tests |
| `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_CHECKLIST.md` | Phase 18 summary |

---

### Task 1: Shared cron authorization

**Files:**
- Create: `src/lib/auth/cron.ts`
- Modify: `src/app/api/cron/expire-orders/route.ts:1-16`
- Test: `tests/unit/cron-auth.test.ts`

**Interfaces:**
- Produces: `authorized(header: string | null, secret: string): boolean`

- [ ] **Step 1: Write the failing test.** Create `tests/unit/cron-auth.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { authorized } from "@/lib/auth/cron";

describe("authorized (cron bearer check)", () => {
  it("accepts exactly Bearer <secret>", () => {
    expect(authorized("Bearer s3cret", "s3cret")).toBe(true);
  });

  it.each([
    ["missing", null],
    ["wrong secret", "Bearer nope!!"],
    ["different length", "Bearer s3cret-and-more"],
    ["no scheme", "s3cret"],
    ["lowercase scheme", "bearer s3cret"],
  ])("rejects %s", (_label, header) => {
    expect(authorized(header, "s3cret")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/unit/cron-auth.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/auth/cron"`.

- [ ] **Step 3: Implement.** Create `src/lib/auth/cron.ts`:

```ts
import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; compared in constant time. */
export function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```

In `src/app/api/cron/expire-orders/route.ts`:
- delete `import { timingSafeEqual } from "node:crypto";` and the local `function authorized(...) { ... }`;
- add `import { authorized } from "@/lib/auth/cron";` to the `@/` import group.

- [ ] **Step 4: Run the tests and static checks**

Run: `npx vitest run tests/unit/cron-auth.test.ts && npm run typecheck && npm run lint`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/cron.ts src/app/api/cron/expire-orders/route.ts tests/unit/cron-auth.test.ts
git commit -m "refactor(cron): share the constant-time CRON_SECRET check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration, verified on live in a rolled-back transaction

**Files:**
- Create: `supabase/migrations/20261001010000_analytics_retention.sql`

**Interfaces:**
- Produces: table `public.analytics_daily_events(day date, event_name text, events int, visitors int, updated_at timestamptz)`, PK `(day, event_name)`; function `public.analytics_rollup_and_purge(p_retention_days integer default 180) returns table (days_rolled_up integer, rows_upserted integer, rows_deleted integer)`.

- [ ] **Step 1: Write the migration.** Create `supabase/migrations/20261001010000_analytics_retention.sql`:

```sql
-- Phase 18: raw analytics events are kept 180 days (whole WIB days); anonymous
-- daily totals per event are kept indefinitely. Spec:
-- docs/superpowers/specs/2026-09-30-analytics-retention-design.md

create table public.analytics_daily_events (
  day date not null,
  event_name text not null check (
    event_name = any (array[
      'PAGE_VIEWED', 'PRODUCT_VIEWED', 'PRODUCT_SEARCHED', 'PRODUCT_RECOMMENDATION_VIEWED',
      'AI_OPENED', 'AI_MESSAGE_SENT', 'AI_RECOMMENDATION_VIEWED', 'AI_RECOMMENDATION_ACCEPTED',
      'ADD_TO_CART', 'REMOVE_FROM_CART', 'CHECKOUT_STARTED', 'PAYMENT_STARTED',
      'ORDER_CREATED', 'ORDER_DELIVERED', 'REVIEW_CREATED',
      'SKIN_QUIZ_STARTED', 'SKIN_QUIZ_COMPLETED', 'LOYALTY_VIEWED', 'VOUCHER_APPLIED', 'RESELLER_AI_USED'
    ]::text[])
  ),
  events integer not null check (events >= 0),
  visitors integer not null check (visitors >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, event_name)
);

comment on table public.analytics_daily_events is
  'Anonymous daily totals per event (WIB days). No identifiers; kept indefinitely. Written only by analytics_rollup_and_purge.';
comment on column public.analytics_daily_events.visitors is
  'Distinct coalesce(anonymous_id, user_id) that day. Events with neither id (DNT/GPC) count in events only.';

alter table public.analytics_daily_events enable row level security;

create policy staff_select_analytics_daily_events on public.analytics_daily_events
  for select to authenticated
  using ((select private.has_any_role(array['admin']::public.app_role[])));

revoke all on public.analytics_daily_events from anon;
revoke all on public.analytics_daily_events from authenticated;
grant select on public.analytics_daily_events to authenticated;

create or replace function public.analytics_rollup_and_purge(p_retention_days integer default 180)
returns table (days_rolled_up integer, rows_upserted integer, rows_deleted integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_yesterday date := v_today - 1;
  v_purge_before date;
  v_latest date;
  v_from date;
  v_days integer := 0;
  v_upserted integer := 0;
  v_deleted integer := 0;
  v_batch integer;
  v_round integer := 0;
begin
  if p_retention_days is null or p_retention_days < 90 then
    raise exception 'analytics retention must be at least 90 days (got %)', p_retention_days;
  end if;
  v_purge_before := v_today - p_retention_days;

  select max(d.day) into v_latest from public.analytics_daily_events d;
  if v_latest is null then
    -- First run: backfill from the oldest raw event (nothing purged yet).
    select (min(e.created_at) at time zone 'Asia/Jakarta')::date into v_from from public.analytics_events e;
  else
    -- Overlap recompute: the last 2 stored days, never reaching back past the
    -- purge boundary (a purged day must not be rebuilt from what is left).
    -- (greatest() ignores NULLs, so the empty case is handled above, not here.)
    v_from := greatest(v_latest - 2, v_purge_before);
  end if;

  if v_from is not null and v_from <= v_yesterday then
    with totals as (
      select (e.created_at at time zone 'Asia/Jakarta')::date as day,
             e.event_name,
             count(*)::integer as events,
             count(distinct coalesce(e.anonymous_id, e.user_id::text))::integer as visitors
      from public.analytics_events e
      where e.created_at >= (v_from::timestamp at time zone 'Asia/Jakarta')
        and e.created_at < ((v_yesterday + 1)::timestamp at time zone 'Asia/Jakarta')
      group by 1, 2
    ),
    upserted as (
      insert into public.analytics_daily_events as t (day, event_name, events, visitors, updated_at)
      select totals.day, totals.event_name, totals.events, totals.visitors, now() from totals
      on conflict (day, event_name) do update
        set events = excluded.events, visitors = excluded.visitors, updated_at = excluded.updated_at
      returning t.day
    )
    select count(*)::integer, count(distinct upserted.day)::integer into v_upserted, v_days from upserted;
  end if;

  -- Purge whole WIB days before the boundary, only when the day has totals.
  loop
    exit when v_round >= 100;
    delete from public.analytics_events e
    where e.id in (
      select r.id from public.analytics_events r
      where r.created_at < (v_purge_before::timestamp at time zone 'Asia/Jakarta')
        and exists (
          select 1 from public.analytics_daily_events d
          where d.day = (r.created_at at time zone 'Asia/Jakarta')::date
        )
      limit 10000
    );
    get diagnostics v_batch = row_count;
    v_deleted := v_deleted + v_batch;
    v_round := v_round + 1;
    exit when v_batch < 10000;
  end loop;

  return query select v_days, v_upserted, v_deleted;
end;
$$;

comment on function public.analytics_rollup_and_purge(integer) is
  'Nightly (Vercel cron /api/cron/analytics-retention): upsert WIB daily totals, then delete whole raw days older than p_retention_days (>= 90).';

revoke all on function public.analytics_rollup_and_purge(integer) from public, anon, authenticated;
grant execute on function public.analytics_rollup_and_purge(integer) to service_role;
```

- [ ] **Step 2: Verify on live in a rolled-back transaction.** Run it with the Supabase MCP `execute_sql` (project `unnnblkqzexvuachlbol`). It is one batch: `begin;`, the whole migration body, the checks, then `rollback;`.
  - Each check is a `do $$ … $$` block with `assert`, so a failed check aborts the batch with its message.
  - The batch deletes the real `analytics_events` rows **inside the transaction** so that the 36 legacy rows don't skew the counts. The rollback restores them.

```sql
begin;
-- <paste the full migration from Step 1 here>

delete from public.analytics_events;  -- rolled back below

-- Check 1: WIB day boundaries and unique visitors.
-- 23:59 WIB on 2026-09-01 is 16:59 UTC; 00:01 WIB on 2026-09-02 is 17:01 UTC on 2026-09-01.
insert into public.analytics_events (event_name, anonymous_id, created_at) values
  ('PAGE_VIEWED', '00000000-0000-4000-8000-000000000001', '2026-09-01 16:59:00+00'),
  ('PAGE_VIEWED', '00000000-0000-4000-8000-000000000001', '2026-09-01 10:00:00+00'),
  ('PAGE_VIEWED', '00000000-0000-4000-8000-000000000002', '2026-09-01 17:01:00+00'),
  ('ORDER_CREATED', '00000000-0000-4000-8000-000000000002', '2026-09-02 03:00:00+00'),
  ('PAGE_VIEWED', null, '2026-09-03 03:00:00+00');
select * from public.analytics_rollup_and_purge(180);
do $$ begin
  assert (select events from public.analytics_daily_events where day = '2026-09-01' and event_name = 'PAGE_VIEWED') = 2, 'check1: 09-01 events';
  assert (select visitors from public.analytics_daily_events where day = '2026-09-01' and event_name = 'PAGE_VIEWED') = 1, 'check1: 09-01 visitors';
  assert (select events from public.analytics_daily_events where day = '2026-09-02' and event_name = 'PAGE_VIEWED') = 1, 'check1: 00:01 WIB is 09-02';
  assert (select visitors from public.analytics_daily_events where day = '2026-09-03' and event_name = 'PAGE_VIEWED') = 0, 'check1: id-less event has no visitor';
end $$;

-- Check 2: a re-run is idempotent.
create temp table snap on commit drop as select day, event_name, events, visitors from public.analytics_daily_events;
select * from public.analytics_rollup_and_purge(180);
do $$ begin
  assert not exists (
    (select day, event_name, events, visitors from public.analytics_daily_events except select * from snap)
    union all
    (select * from snap except select day, event_name, events, visitors from public.analytics_daily_events)
  ), 'check2: rerun changed totals';
end $$;

-- Check 3: first run (empty totals) with an event 200 days old: totals written, then raw deleted.
delete from public.analytics_daily_events;
delete from public.analytics_events;
insert into public.analytics_events (event_name, anonymous_id, created_at)
  values ('PRODUCT_VIEWED', '00000000-0000-4000-8000-000000000003', now() - interval '200 days');
select * from public.analytics_rollup_and_purge(180);
do $$ begin
  assert (select count(*) from public.analytics_events) = 0, 'check3: old raw row not purged';
  assert (select events from public.analytics_daily_events where event_name = 'PRODUCT_VIEWED') = 1, 'check3: totals missing';
end $$;

-- Check 4: never delete a day without totals; whole-day purge; a purged day's totals are never rebuilt.
insert into public.analytics_events (event_name, anonymous_id, created_at) values
  ('ADD_TO_CART', '00000000-0000-4000-8000-000000000004', now() - interval '181 days'),
  ('ADD_TO_CART', '00000000-0000-4000-8000-000000000005', now() - interval '179 days'),
  ('ADD_TO_CART', '00000000-0000-4000-8000-000000000006', now() - interval '1 day');
select * from public.analytics_rollup_and_purge(180);
do $$ begin
  -- The 181-day-old day lies before the overlap window, so it has no totals: it must survive.
  assert (select count(*) from public.analytics_events where created_at < now() - interval '180 days') = 1, 'check4: day without totals was purged';
end $$;
-- Totals for those two days, as if written by earlier nightly runs.
insert into public.analytics_daily_events (day, event_name, events, visitors)
select (created_at at time zone 'Asia/Jakarta')::date, event_name, 1, 1 from public.analytics_events
where created_at < now() - interval '2 days'
on conflict (day, event_name) do nothing;
create temp table snap4 on commit drop as
  select day, events from public.analytics_daily_events where event_name = 'ADD_TO_CART';
select * from public.analytics_rollup_and_purge(180);
do $$ begin
  assert (select count(*) from public.analytics_events
          where created_at < ((((now() at time zone 'Asia/Jakarta')::date - 180)::timestamp) at time zone 'Asia/Jakarta')) = 0,
         'check4: day before the boundary not purged';
  assert (select count(*) from public.analytics_events where created_at > now() - interval '180 days' and created_at < now() - interval '2 days') = 1, 'check4: 179-day-old row wrongly purged';
  assert not exists (
    select 1 from snap4 s join public.analytics_daily_events d on d.day = s.day and d.event_name = 'ADD_TO_CART'
    where d.events <> s.events and d.day < (now() at time zone 'Asia/Jakarta')::date - 3
  ), 'check4: an old day''s totals changed';
end $$;

-- Check 5: guard.
do $$ begin
  begin
    perform public.analytics_rollup_and_purge(30);
    raise exception 'check5: guard did not fire';
  exception when others then
    if sqlerrm not like 'analytics retention must be at least 90 days%' then raise; end if;
  end;
end $$;

-- Check 6: privileges.
do $$ begin
  assert not has_function_privilege('anon', 'public.analytics_rollup_and_purge(integer)', 'execute'), 'check6: anon can execute';
  assert not has_function_privilege('authenticated', 'public.analytics_rollup_and_purge(integer)', 'execute'), 'check6: authenticated can execute';
  assert has_function_privilege('service_role', 'public.analytics_rollup_and_purge(integer)', 'execute'), 'check6: service_role cannot execute';
  assert not has_table_privilege('anon', 'public.analytics_daily_events', 'select'), 'check6: anon can select';
  assert not has_table_privilege('authenticated', 'public.analytics_daily_events', 'insert'), 'check6: authenticated can insert';
end $$;

rollback;
```

Expected: the batch completes with no assertion error. Then confirm nothing leaked: `select to_regclass('public.analytics_daily_events')` returns `null`, and `select count(*) from public.analytics_events` returns 36.

About check 4: subtracting whole days keeps the time of day (WIB has no daylight saving), so the 181-day-old row is always on WIB day `today − 181`, before the boundary `today − 180`. The 179-day-old row is always after it. On the first call in this check, the overlap window starts at the boundary, so the 179-day-old day gets totals and the 181-day-old day doesn't. That's exactly what the first assertion checks.

Staff RLS read, in a second rolled-back batch. Get an admin user id and a customer user id first, read-only: `select user_id, role from public.user_roles limit 10`. If that table has a different name, find it with `select tablename from pg_tables where schemaname = 'public' and tablename like '%role%'`. Then run:

```sql
begin;
-- <paste the migration again>
insert into public.analytics_daily_events (day, event_name, events, visitors) values ('2026-09-01', 'PAGE_VIEWED', 1, 1);
set local role authenticated;
set local request.jwt.claims = '{"sub":"<ADMIN_USER_ID>","role":"authenticated"}';
do $$ begin assert (select count(*) from public.analytics_daily_events) = 1, 'rls: admin cannot read'; end $$;
set local request.jwt.claims = '{"sub":"<CUSTOMER_USER_ID>","role":"authenticated"}';
do $$ begin assert (select count(*) from public.analytics_daily_events) = 0, 'rls: customer can read'; end $$;
rollback;
```

- [ ] **Step 3: Commit the migration file (not yet applied)**

```bash
git add supabase/migrations/20261001010000_analytics_retention.sql
git commit -m "feat(analytics): retention migration: daily totals table and rollup/purge function

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Apply to live and regenerate types (owner go-ahead required)

**Files:**
- Modify: `src/types/database.ts` (regenerated)

- [ ] **Step 1: Ask the owner.** "The Phase 18 migration passed every check in a rolled-back transaction. May I apply it to the live project now?" Stop until the owner says yes.
- [ ] **Step 2: Apply.** Use the MCP `apply_migration` with name `analytics_retention` and the exact file contents.
Expected: success. Then `select to_regclass('public.analytics_daily_events')` returns the table name.
- [ ] **Step 3: Check the advisors.** Run the MCP `get_advisors` for `security`.
Expected: nothing that names `analytics_daily_events` or `analytics_rollup_and_purge`.
- [ ] **Step 4: Regenerate the types.** Run the MCP `generate_typescript_types`, and write the result to `src/types/database.ts`, keeping the two-line `// GENERATED …` header.
Run: `npm run typecheck`
Expected: PASS. `git diff src/types/database.ts` should show only the new table and function.
- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts
git commit -m "chore(types): regenerate database types (analytics_daily_events)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cron route

**Files:**
- Create: `src/app/api/cron/analytics-retention/route.ts`
- Modify: `src/constants/analytics.ts` (append), `vercel.json`
- Test: `tests/integration/analytics-retention-cron.test.ts`

**Interfaces:**
- Consumes: `authorized` (Task 1); RPC `analytics_rollup_and_purge` (Tasks 2 and 3).
- Produces: `ANALYTICS_RETENTION_DAYS = 180`; `GET /api/cron/analytics-retention` → `200 { daysRolledUp, rowsUpserted, rowsDeleted }` | `401` | `503` | `500`.

- [ ] **Step 1: Write the failing test.** Create `tests/integration/analytics-retention-cron.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  env: { CRON_SECRET: "s3cret" as string | undefined, SUPABASE_SERVICE_ROLE_KEY: "service" as string | undefined },
  rpc: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({ getServerEnv: () => mocks.env }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));

import { GET } from "@/app/api/cron/analytics-retention/route";

const call = (authorization?: string) =>
  GET(new NextRequest("http://localhost/api/cron/analytics-retention", { headers: authorization ? { authorization } : {} }));

describe("GET /api/cron/analytics-retention", () => {
  beforeEach(() => {
    mocks.env = { CRON_SECRET: "s3cret", SUPABASE_SERVICE_ROLE_KEY: "service" };
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [{ days_rolled_up: 2, rows_upserted: 9, rows_deleted: 40 }], error: null });
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("is unavailable until the cron secret and service role are configured", async () => {
    mocks.env = { CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: "service" };
    expect((await call("Bearer s3cret")).status).toBe(503);
    mocks.env = { CRON_SECRET: "s3cret", SUPABASE_SERVICE_ROLE_KEY: undefined };
    expect((await call("Bearer s3cret")).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a wrong or missing secret without touching data", async () => {
    expect((await call("Bearer wrong!")).status).toBe(401);
    expect((await call()).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rolls up and purges with 180-day retention and reports the counts", async () => {
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ daysRolledUp: 2, rowsUpserted: 9, rowsDeleted: 40 });
    expect(mocks.rpc).toHaveBeenCalledWith("analytics_rollup_and_purge", { p_retention_days: 180 });
  });

  it("fails loudly when the database call fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "failed" });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/integration/analytics-retention-cron.test.ts`
Expected: FAIL, because `@/app/api/cron/analytics-retention/route` can't be resolved.

- [ ] **Step 3: Implement.** Append to `src/constants/analytics.ts`:

```ts
/** Raw events older than this (whole WIB days) are deleted nightly; daily totals stay. */
export const ANALYTICS_RETENTION_DAYS = 180;
```

Create `src/app/api/cron/analytics-retention/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

import { ANALYTICS_RETENTION_DAYS } from "@/constants/analytics";
import { authorized } from "@/lib/auth/cron";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (01:30 WIB): rolls raw analytics events up into anonymous daily
 * totals, then deletes whole raw days older than the retention period
 * (public.analytics_rollup_and_purge). A missed night is caught up next run.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!env.CRON_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), env.CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await createAdminClient().rpc("analytics_rollup_and_purge", { p_retention_days: ANALYTICS_RETENTION_DAYS });
  if (error) {
    console.error("[analytics-retention] failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  const row = data?.[0];
  const counts = { daysRolledUp: row?.days_rolled_up ?? 0, rowsUpserted: row?.rows_upserted ?? 0, rowsDeleted: row?.rows_deleted ?? 0 };
  console.info("[analytics-retention]", counts);
  return NextResponse.json(counts);
}
```

Replace `vercel.json` with:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/expire-orders", "schedule": "0 18 * * *" },
    { "path": "/api/cron/analytics-retention", "schedule": "30 18 * * *" }
  ]
}
```

- [ ] **Step 4: Run the tests and static checks**

Run: `npx vitest run tests/integration/analytics-retention-cron.test.ts && npm run typecheck && npm run lint`
Expected: PASS, 4 tests. The typecheck relies on Task 3's regenerated types for the `rpc` name.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/analytics-retention/route.ts src/constants/analytics.ts vercel.json tests/integration/analytics-retention-cron.test.ts
git commit -m "feat(analytics): nightly cron route for rollup and 180-day retention

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Trend model

**Files:**
- Create: `src/services/analytics/trend.ts`
- Test: `tests/unit/analytics-trend.test.ts`

**Interfaces:**
- Produces:
  - `TREND_RANGES = [3, 6, 12] as const`; `type TrendRange = 3 | 6 | 12`
  - `parseTrendRange(value: string | string[] | undefined): TrendRange` (default 6)
  - `wibToday(now?: Date): string`
  - `trendRange(todayWib: string, months: TrendRange): { from: string; to: string }`, where `from` is the first day of the month `months` months before today and `to` is yesterday
  - `type DailyTotal = { day: string; event_name: string; events: number; visitors: number }`
  - `type Trend = { from; to; weeks: { weekStart; pageVisitors; orderVisitors }[]; months: { month; events; visitors; conversion: number | null }[] }`
  - `buildTrend(rows: DailyTotal[], range: { from: string; to: string }): Trend`

- [ ] **Step 1: Write the failing tests.** Create `tests/unit/analytics-trend.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildTrend, parseTrendRange, trendRange, wibToday, type DailyTotal } from "@/services/analytics/trend";

const row = (day: string, event_name: string, events: number, visitors: number): DailyTotal => ({ day, event_name, events, visitors });

describe("trend range", () => {
  it("parses ?tren with a default of 6 months", () => {
    expect(parseTrendRange("3")).toBe(3);
    expect(parseTrendRange("12")).toBe(12);
    expect(parseTrendRange(undefined)).toBe(6);
    expect(parseTrendRange("5")).toBe(6);
    expect(parseTrendRange(["12", "3"])).toBe(12);
  });

  it("covers whole months up to yesterday", () => {
    expect(trendRange("2026-09-30", 3)).toEqual({ from: "2026-06-01", to: "2026-09-29" });
    expect(trendRange("2026-01-01", 6)).toEqual({ from: "2025-07-01", to: "2025-12-31" });
  });

  it("uses the WIB calendar day", () => {
    // 2026-09-30 18:00 UTC is 01:00 on 2026-10-01 in WIB.
    expect(wibToday(new Date("2026-09-30T18:00:00Z"))).toBe("2026-10-01");
    expect(wibToday(new Date("2026-09-30T16:59:00Z"))).toBe("2026-09-30");
  });
});

describe("buildTrend", () => {
  const range = { from: "2026-09-01", to: "2026-09-30" };
  const rows = [
    row("2026-09-07", "PAGE_VIEWED", 10, 4), // Monday
    row("2026-09-13", "PAGE_VIEWED", 5, 3), // Sunday: same week as 09-07
    row("2026-09-13", "ORDER_CREATED", 1, 1),
    row("2026-09-21", "PAGE_VIEWED", 2, 2),
    row("2026-10-01", "PAGE_VIEWED", 99, 99), // outside the range
    row("2026-08-30", "PAGE_VIEWED", 99, 99), // outside the range
  ];

  it("groups Monday-start weeks, Sundays included, and fills empty weeks with 0", () => {
    expect(buildTrend(rows, range).weeks).toEqual([
      { weekStart: "2026-08-31", pageVisitors: 0, orderVisitors: 0 },
      { weekStart: "2026-09-07", pageVisitors: 7, orderVisitors: 1 },
      { weekStart: "2026-09-14", pageVisitors: 0, orderVisitors: 0 },
      { weekStart: "2026-09-21", pageVisitors: 2, orderVisitors: 0 },
      { weekStart: "2026-09-28", pageVisitors: 0, orderVisitors: 0 },
    ]);
  });

  it("sums months and computes conversion from summed daily visitors", () => {
    const [september] = buildTrend(rows, range).months;
    expect(september).toMatchObject({
      month: "2026-09",
      events: { PAGE_VIEWED: 17, ORDER_CREATED: 1 },
      visitors: { PAGE_VIEWED: 9, ORDER_CREATED: 1 },
    });
    expect(september?.conversion).toBeCloseTo(1 / 9);
  });

  it("has no conversion for a month without page visitors, and lists every month in range", () => {
    const trend = buildTrend([row("2026-08-10", "ORDER_CREATED", 1, 1)], { from: "2026-07-01", to: "2026-08-31" });
    expect(trend.months.map((month) => [month.month, month.conversion])).toEqual([
      ["2026-07", null],
      ["2026-08", null],
    ]);
  });

  it("ignores unknown event names", () => {
    const trend = buildTrend([row("2026-09-02", "LEGACY_THING", 3, 3)], range);
    expect(trend.months[0]?.events).toEqual({});
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/unit/analytics-trend.test.ts`
Expected: FAIL with `Failed to resolve import "@/services/analytics/trend"`.

- [ ] **Step 3: Implement.** Create `src/services/analytics/trend.ts`:

```ts
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/constants/analytics";

// Long-term trend from anonymous daily totals (analytics_daily_events). Days
// are WIB calendar days as ISO strings; date math runs in UTC on those
// strings, so no local time zone is involved. "Visitors" are summed per day:
// someone who visits on 3 days counts 3 times.

export const TREND_RANGES = [3, 6, 12] as const;
export type TrendRange = (typeof TREND_RANGES)[number];

export type DailyTotal = { day: string; event_name: string; events: number; visitors: number };

export type Trend = {
  from: string;
  to: string;
  weeks: { weekStart: string; pageVisitors: number; orderVisitors: number }[];
  months: {
    month: string;
    events: Partial<Record<AnalyticsEventName, number>>;
    visitors: Partial<Record<AnalyticsEventName, number>>;
    conversion: number | null;
  }[];
};

const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const KNOWN = new Set<string>(ANALYTICS_EVENTS);

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
const mondayOf = (iso: string) => addDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));

export function parseTrendRange(value: string | string[] | undefined): TrendRange {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return (TREND_RANGES as readonly number[]).includes(parsed) ? (parsed as TrendRange) : 6;
}

/** Today's calendar date in WIB (UTC+7, no daylight saving). */
export function wibToday(now: Date = new Date()): string {
  return toIso(new Date(now.getTime() + WIB_OFFSET_MS));
}

/** From the first day of the month `months` months ago, up to yesterday (today is incomplete). */
export function trendRange(todayWib: string, months: TrendRange): { from: string; to: string } {
  const today = toDate(todayWib);
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months, 1));
  return { from: toIso(from), to: addDays(todayWib, -1) };
}

export function buildTrend(rows: DailyTotal[], range: { from: string; to: string }): Trend {
  const weeks = new Map<string, { weekStart: string; pageVisitors: number; orderVisitors: number }>();
  for (let week = mondayOf(range.from); week <= range.to; week = addDays(week, 7)) {
    weeks.set(week, { weekStart: week, pageVisitors: 0, orderVisitors: 0 });
  }

  const months = new Map<string, Trend["months"][number]>();
  const start = toDate(range.from);
  for (let index = 0; ; index++) {
    const month = toIso(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1))).slice(0, 7);
    if (`${month}-01` > range.to) break;
    months.set(month, { month, events: {}, visitors: {}, conversion: null });
  }

  for (const row of rows) {
    if (row.day < range.from || row.day > range.to || !KNOWN.has(row.event_name)) continue;
    const name = row.event_name as AnalyticsEventName;
    const week = weeks.get(mondayOf(row.day));
    if (week && name === "PAGE_VIEWED") week.pageVisitors += row.visitors;
    if (week && name === "ORDER_CREATED") week.orderVisitors += row.visitors;
    const month = months.get(row.day.slice(0, 7));
    if (month) {
      month.events[name] = (month.events[name] ?? 0) + row.events;
      month.visitors[name] = (month.visitors[name] ?? 0) + row.visitors;
    }
  }

  for (const month of months.values()) {
    const pages = month.visitors.PAGE_VIEWED ?? 0;
    month.conversion = pages > 0 ? (month.visitors.ORDER_CREATED ?? 0) / pages : null;
  }

  return { from: range.from, to: range.to, weeks: [...weeks.values()], months: [...months.values()] };
}
```

If the event-name array in `src/constants/analytics.ts` isn't exported as `ANALYTICS_EVENTS` (line 30 derives `AnalyticsEventName` from `(typeof ANALYTICS_EVENTS)[number]`), import it under its actual exported name.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npx vitest run tests/unit/analytics-trend.test.ts && npm run typecheck`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/analytics/trend.ts tests/unit/analytics-trend.test.ts
git commit -m "feat(analytics): weekly and monthly trend model from daily totals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin trend section

**Files:**
- Modify: `src/services/admin/analytics.ts` (append `getAnalyticsTrend`)
- Create: `src/features/admin/trend-chart.tsx`
- Modify: `src/app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `buildTrend`, `trendRange`, `wibToday`, `parseTrendRange`, `TREND_RANGES`, `Trend`, `TrendRange` (Task 5); table `analytics_daily_events` (Task 3 types).
- Produces: `getAnalyticsTrend(months: TrendRange): Promise<{ status: "ok"; trend: Trend } | { status: "error" }>`; `TrendSection({ months, errorHref })` (async server component); `TrendSkeleton()`.

- [ ] **Step 1: Add the service.** Append to `src/services/admin/analytics.ts`, putting the import with the other `@/services/analytics/...` import:

```ts
import { buildTrend, trendRange, wibToday, type Trend, type TrendRange } from "@/services/analytics/trend";

/** Long-term trend from anonymous daily totals (staff RLS). Up to yesterday, WIB. */
export async function getAnalyticsTrend(months: TrendRange): Promise<{ status: "ok"; trend: Trend } | { status: "error" }> {
  const db = await createClient();
  const range = trendRange(wibToday(), months);
  const { data, error } = await db
    .from("analytics_daily_events")
    .select("day, event_name, events, visitors")
    .gte("day", range.from)
    .lte("day", range.to)
    .limit(20_000);
  if (error) {
    console.error("[admin] analytics trend failed", error);
    return { status: "error" };
  }
  return { status: "ok", trend: buildTrend(data ?? [], range) };
}
```

(13 months × 31 days × 20 event names is at most about 8,100 rows, so `limit(20_000)` never truncates.)

- [ ] **Step 2: Create `src/features/admin/trend-chart.tsx`**

```tsx
import { Skeleton } from "@/components/ui/states";
import { InsightError } from "@/features/admin/insight-error";
import { getAnalyticsTrend } from "@/services/admin/analytics";
import type { Trend, TrendRange } from "@/services/analytics/trend";

const W = 640;
const H = 200;
const PAD = 8;

const number = (value: number) => value.toLocaleString("id-ID");
const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

const COLUMNS = [
  { key: "PRODUCT_VIEWED", label: "Produk dilihat" },
  { key: "ADD_TO_CART", label: "Tambah ke keranjang" },
  { key: "CHECKOUT_STARTED", label: "Checkout" },
  { key: "ORDER_CREATED", label: "Pesanan" },
] as const;

function points(values: number[], max: number): string {
  const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  return values.map((value, index) => `${PAD + index * step},${H - PAD - (value / max) * (H - PAD * 2)}`).join(" ");
}

function TrendChart({ trend, months }: { trend: Trend; months: TrendRange }) {
  const pages = trend.weeks.map((week) => week.pageVisitors);
  const orders = trend.weeks.map((week) => week.orderVisitors);
  const max = Math.max(1, ...pages, ...orders);
  const summary = `Tren mingguan ${months} bulan: pengunjung halaman dari ${number(pages[0] ?? 0)} ke ${number(pages.at(-1) ?? 0)}, pengunjung yang memesan dari ${number(orders[0] ?? 0)} ke ${number(orders.at(-1) ?? 0)}.`;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-caption text-text-secondary">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-6 bg-brand-cocoa" /> Pengunjung halaman
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-6 bg-ai-accent" /> Pengunjung yang memesan
        </span>
        <span className="ml-auto">Maks. {number(max)} / minggu</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-48 w-full" preserveAspectRatio="none">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points={points(pages, max)} fill="none" className="stroke-brand-cocoa" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <polyline points={points(orders, max)} fill="none" className="stroke-ai-accent" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex justify-between text-caption text-text-secondary">
        <span>{dayLabel(trend.weeks[0]?.weekStart ?? trend.from)}</span>
        <span>{dayLabel(trend.to)}</span>
      </figcaption>
    </figure>
  );
}

/** Long-term trend from anonymous daily totals. Streams in; the reports above never wait for it. */
export async function TrendSection({ months, errorHref }: { months: TrendRange; errorHref: string }) {
  const result = await getAnalyticsTrend(months);
  if (result.status === "error") return <InsightError href={errorHref} />;
  const { trend } = result;
  const empty = trend.months.every((month) => Object.keys(month.events).length === 0);

  return (
    <div className="flex flex-col gap-6">
      {empty ? (
        <p className="text-body-s text-text-secondary">Ringkasan harian tersedia setelah proses malam pertama.</p>
      ) : (
        <>
          <TrendChart trend={trend} months={months} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-left text-body-s">
              <caption className="sr-only">Total bulanan dari ringkasan harian</caption>
              <thead className="text-caption text-text-secondary">
                <tr>
                  <th scope="col" className="py-2 font-medium">Bulan</th>
                  <th scope="col" className="py-2 text-right font-medium">Kunjungan</th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className="py-2 text-right font-medium">
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className="py-2 text-right font-medium">Konversi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trend.months.map((month) => (
                  <tr key={month.month}>
                    <th scope="row" className="py-2 font-normal">{monthLabel(month.month)}</th>
                    <td className="py-2 text-right">{number(month.visitors.PAGE_VIEWED ?? 0)}</td>
                    {COLUMNS.map((column) => (
                      <td key={column.key} className="py-2 text-right">{number(month.events[column.key] ?? 0)}</td>
                    ))}
                    <td className="py-2 text-right">{percent(month.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-caption text-text-secondary">
        Pengunjung dihitung per hari lalu dijumlah; satu orang yang datang 3 hari terhitung 3. Data sampai kemarin.
      </p>
    </div>
  );
}

export function TrendSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

`min-w-xl` is Tailwind's `36rem` width token. It keeps the six-column table readable, scrolling sideways on phones. If the project's `@theme` resets the container scale so that `min-w-xl` doesn't exist, check `src/app/globals.css` for `--container-*`. In that case add `--container-xl: 36rem;` under the existing spacing tokens and record a ruling.

- [ ] **Step 3: Wire it into the page.** In `src/app/admin/analytics/page.tsx`:

Add these imports:

```tsx
import { Suspense } from "react";

import { TrendSection, TrendSkeleton } from "@/features/admin/trend-chart";
import { parseTrendRange, TREND_RANGES } from "@/services/analytics/trend";
```

Replace these three lines:

```tsx
  const days = parseReportWindow((await searchParams).hari);
  const report = await getAnalyticsReport(days);
  const href = (window: number) => (window === 30 ? ROUTES.admin.analytics : `${ROUTES.admin.analytics}?hari=${window}`);
```

with:

```tsx
  const params = await searchParams;
  const days = parseReportWindow(params.hari);
  const months = parseTrendRange(params.tren);
  const report = await getAnalyticsReport(days);
  // Both selectors keep each other's value; defaults (30 days, 6 months) stay out of the URL.
  const href = (window: number, trend: number = months) => {
    const query = new URLSearchParams();
    if (window !== 30) query.set("hari", String(window));
    if (trend !== 6) query.set("tren", String(trend));
    const search = query.toString();
    return search ? `${ROUTES.admin.analytics}?${search}` : ROUTES.admin.analytics;
  };
```

Directly before the page's final `</>`, after the `{!report ? … : …}` block, add:

```tsx
      <Card as="section" padding="lg" aria-labelledby="trend-title" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="trend-title" className="text-h4">
            Tren jangka panjang
          </h2>
          <nav aria-label="Rentang tren" className="flex gap-1 rounded-md border border-border bg-background p-1">
            {TREND_RANGES.map((range) => (
              <Link
                key={range}
                href={href(days, range)}
                aria-current={range === months ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-sm px-3 text-body-s",
                  range === months ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {range} bulan
              </Link>
            ))}
          </nav>
        </div>
        <Suspense key={months} fallback={<TrendSkeleton />}>
          <TrendSection months={months} errorHref={href(days)} />
        </Suspense>
      </Card>
```

The existing `href(window)` calls keep working, because the second argument defaults to the current `months`.

- [ ] **Step 4: Static checks, unit tests, and a build**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all pass. The build proves the Server Component compiles. The admin page can't be exercised in E2E, because the suite never signs in.

- [ ] **Step 5: Commit**

```bash
git add src/services/admin/analytics.ts src/features/admin/trend-chart.tsx src/app/admin/analytics/page.tsx
git commit -m "feat(admin): long-term analytics trend from daily totals (3/6/12 months)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Privacy page

**Files:**
- Modify: `src/app/(storefront)/kebijakan-privasi/page.tsx` (Analytics list)
- Test: `tests/e2e/analytics.spec.ts` (the privacy page test, around line 86)

- [ ] **Step 1: Write the failing E2E assertion.** In the existing test that opens `/kebijakan-privasi` from the footer, after `await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kebijakan Privasi");`, add:

```ts
    await expect(page.getByText("Data kejadian mentah disimpan paling lama 180 hari")).toBeVisible();
```

- [ ] **Step 2: Run it against the current build to confirm it fails.**
  1. Stop any server on port 3100: `lsof -nP -iTCP:3100 -sTCP:LISTEN`, then kill that PID.
  2. `npm run build`.
  3. Start `npm run start -- --port 3100` in the background, and wait for HTTP 200 on `/`.
  4. Run `npx playwright test tests/e2e/analytics.spec.ts -g "rivasi"`.

Expected: FAIL, because the text isn't on the page.

- [ ] **Step 3: Implement.** In `src/app/(storefront)/kebijakan-privasi/page.tsx`:
- import `ANALYTICS_RETENTION_DAYS` from `@/constants/analytics`;
- add this `<li>` after the "tidak berjalan sama sekali … Global Privacy Control" item in the Analytics list:

```tsx
              <li>
                Data kejadian mentah disimpan paling lama {ANALYTICS_RETENTION_DAYS} hari. Setelah itu kami hanya menyimpan jumlah harian tanpa ID apa pun.
              </li>
```

- [ ] **Step 4: Rebuild, restart the server, and run the whole analytics E2E file.** Stop the old PID first.

Run: `npx playwright test tests/e2e/analytics.spec.ts`
Expected: all pass, including the privacy page's axe check.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(storefront)/kebijakan-privasi/page.tsx" tests/e2e/analytics.spec.ts
git commit -m "feat(privacy): state the 180-day analytics retention

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Docs and full validation

**Files:**
- Modify: `docs/ARCHITECTURE.md`:
  - header lines 5-7;
  - add "Phase 18 summary" above "Phase 17 summary";
  - add validation-table row 18;
  - in the Phase 16 summary's "Not yet" list, change "Retention/aggregation of raw events (Phase 18)" to "Retention/aggregation of raw events: done in Phase 18".
- Modify: `docs/IMPLEMENTATION_CHECKLIST.md`

- [ ] **Step 1: Full validation.**
  1. Run `npm run validate` into a log.
  2. Stop any server on 3100, and start `npm run start -- --port 3100` on the fresh build.
  3. Run `npx playwright test` into a log.

Expected: validate passes, and Playwright reports 0 failed. Write down the unit count and the passed/skipped counts.

- [ ] **Step 2: Update the docs.** Header: `(Phase 18)`, "Phase 18 Analytics retention, done and validated", next "Phase 19". Add this summary:

```markdown
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
- **Verified on live** in a rolled-back transaction: WIB day boundaries, idempotent re-runs, first-run backfill before purge, whole-day purge that never deletes a day without totals, the guard, privileges, and staff/customer RLS. Security advisors: nothing new.
- **Not covered by E2E:** the admin trend section (the suite never signs in). Covered by `buildTrend` unit tests and the cron route integration tests.
```

Add validation row 18 in the same format as row 17, with the Step 1 counts. In `IMPLEMENTATION_CHECKLIST.md`, add `- [x] Analytics retention (Phase 18: 180-day raw events, anonymous daily totals, admin trend)` directly under the "Advanced analytics (Phase 16 …)" line.

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md docs/IMPLEMENTATION_CHECKLIST.md
git commit -m "docs: Phase 18 analytics retention summary and validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
