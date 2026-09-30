-- Phase 16: analytics event contract v1 (CLAUDE.md §14, PRD §30).
--
-- 1. Vocabulary: the event_name CHECK moves from the old lowercase names to
--    the CNS event vocabulary. Existing rows are mapped (product_view →
--    PRODUCT_VIEWED, ai_started → AI_OPENED, …) and marked event_version 0.
-- 2. Versioning: event_version (1 = this contract).
-- 3. Ingestion is server-only: the app writes through the service role after
--    validation, rate limiting and PII minimisation. anon/authenticated lose
--    every write privilege (anon also held TRUNCATE, which bypasses RLS).
--    Staff keep read access through the existing staff_select policy.
-- 4. properties is a small JSON object (≤ 2 KB).
-- 5. analytics_funnel() / analytics_event_counts(): aggregates for staff
--    dashboards, SECURITY INVOKER so the caller's RLS applies (non-staff
--    see nothing).

alter table public.analytics_events drop constraint analytics_events_event_name_check;

alter table public.analytics_events add column event_version smallint not null default 1
  check (event_version between 0 and 100);

update public.analytics_events
set event_version = 0,
    event_name = case event_name
      when 'page_view' then 'PAGE_VIEWED'
      when 'product_view' then 'PRODUCT_VIEWED'
      when 'search' then 'PRODUCT_SEARCHED'
      when 'add_to_cart' then 'ADD_TO_CART'
      when 'remove_from_cart' then 'REMOVE_FROM_CART'
      when 'checkout_started' then 'CHECKOUT_STARTED'
      when 'purchase' then 'ORDER_CREATED'
      when 'ai_started' then 'AI_OPENED'
      when 'ai_completed' then 'AI_MESSAGE_SENT'
      when 'recommendation_clicked' then 'AI_RECOMMENDATION_ACCEPTED'
      when 'review_submitted' then 'REVIEW_CREATED'
      else event_name
    end;

-- Old names without a v1 equivalent (routine_*, whatsapp_clicked, loyalty_*)
-- have no rows today; drop any that appear before this runs.
delete from public.analytics_events where event_name !~ '^[A-Z_]+$';

alter table public.analytics_events add constraint analytics_events_event_name_check check (
  event_name = any (array[
    'PAGE_VIEWED', 'PRODUCT_VIEWED', 'PRODUCT_SEARCHED', 'PRODUCT_RECOMMENDATION_VIEWED',
    'AI_OPENED', 'AI_MESSAGE_SENT', 'AI_RECOMMENDATION_VIEWED', 'AI_RECOMMENDATION_ACCEPTED',
    'ADD_TO_CART', 'REMOVE_FROM_CART', 'CHECKOUT_STARTED', 'PAYMENT_STARTED',
    'ORDER_CREATED', 'ORDER_DELIVERED', 'REVIEW_CREATED',
    'SKIN_QUIZ_STARTED', 'SKIN_QUIZ_COMPLETED', 'LOYALTY_VIEWED', 'VOUCHER_APPLIED', 'RESELLER_AI_USED'
  ]::text[])
);

alter table public.analytics_events add constraint analytics_events_properties_check
  check (jsonb_typeof(properties) = 'object' and pg_column_size(properties) <= 2048);
alter table public.analytics_events add constraint analytics_events_path_check
  check (path is null or char_length(path) <= 300);
alter table public.analytics_events add constraint analytics_events_anonymous_id_check
  check (anonymous_id is null or anonymous_id ~ '^[0-9a-f-]{36}$');

comment on column public.analytics_events.event_version is 'Event contract version: 1 = Phase 16 contract, 0 = migrated legacy rows.';

-- Funnel queries scan one window by event name and group by visitor.
create index if not exists analytics_events_time_name_idx on public.analytics_events (created_at desc, event_name);

revoke all on public.analytics_events from anon;
revoke all on public.analytics_events from authenticated;
grant select on public.analytics_events to authenticated;

-- Unique visitors per step, counting a visitor at step N only when they also
-- reached steps 1..N-1 in the window (order-agnostic). A visitor is the
-- first-party anonymous id when known, otherwise the user id.
create or replace function public.analytics_funnel(p_steps text[], p_since timestamptz)
returns table (step integer, event_name text, visitors bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with seen as (
    select coalesce(e.anonymous_id, e.user_id::text) as visitor, e.event_name
    from public.analytics_events e
    where e.created_at >= p_since
      and e.event_name = any (p_steps)
      and coalesce(e.anonymous_id, e.user_id::text) is not null
    group by 1, 2
  ),
  steps as (
    select s.name, s.ord::integer as ord from unnest(p_steps) with ordinality as s(name, ord)
  )
  select st.ord, st.name,
    (select count(*) from (
      select seen.visitor from seen
      where seen.event_name = any (p_steps[1:st.ord])
      group by seen.visitor
      having count(distinct seen.event_name) = st.ord
    ) reached)
  from steps st
  order by st.ord;
$$;

-- Events and unique visitors per event name in the window.
create or replace function public.analytics_event_counts(p_since timestamptz)
returns table (event_name text, events bigint, visitors bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.event_name, count(*), count(distinct coalesce(e.anonymous_id, e.user_id::text))
  from public.analytics_events e
  where e.created_at >= p_since
  group by e.event_name
  order by count(*) desc;
$$;

revoke all on function public.analytics_funnel(text[], timestamptz) from public, anon;
revoke all on function public.analytics_event_counts(timestamptz) from public, anon;
grant execute on function public.analytics_funnel(text[], timestamptz) to authenticated;
grant execute on function public.analytics_event_counts(timestamptz) to authenticated;
