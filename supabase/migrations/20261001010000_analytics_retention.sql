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
