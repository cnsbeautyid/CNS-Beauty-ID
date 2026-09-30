-- Phase 15: audit trail for admin actions (PRD §29 "Audit admin actions").
--
-- Append-only. Staff (admin/owner) insert their own entries through RLS
-- (actor_id must be the caller) and read all entries. Nobody updates or
-- removes rows: there are no UPDATE/DELETE policies, the privileges are
-- revoked, and a trigger rejects both, including for the service role.
-- No existing table, policy or function is changed.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id text check (char_length(entity_id) <= 120),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object' and pg_column_size(summary) <= 8192),
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is 'Append-only log of admin actions. Written by the app as the acting staff member.';

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id);

alter table public.admin_audit_log enable row level security;

create policy staff_select_admin_audit_log on public.admin_audit_log
  for select to authenticated
  using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy staff_insert_admin_audit_log on public.admin_audit_log
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (select private.has_any_role(array['admin']::public.app_role[]))
  );

revoke all on public.admin_audit_log from anon;
revoke update, delete, truncate on public.admin_audit_log from authenticated;
grant select, insert on public.admin_audit_log to authenticated;

create function private.admin_audit_log_immutable()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only' using errcode = '42501';
end;
$$;

create trigger admin_audit_log_immutable
  before update or delete on public.admin_audit_log
  for each row execute function private.admin_audit_log_immutable();
