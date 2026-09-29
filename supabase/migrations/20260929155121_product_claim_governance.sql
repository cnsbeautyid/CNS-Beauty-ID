-- Product claim governance (master prompt §17).
--
-- product_benefits, product_faqs and products.description/positioning had no
-- approval state, yet were publicly readable for active products and contain
-- unverified claims. After this migration:
--   * benefits/FAQs are publicly readable only when review_status = 'approved';
--   * product marketing copy carries copy_status (enforced by the storefront,
--     because RLS is row-level and cannot hide individual columns);
--   * approving stamps who/when; editing approved text resets it to
--     'pending_review', so changed claims never stay "approved".
-- Existing rows start as 'draft' (hidden) until an admin approves them.
-- Reuses the existing public.content_status enum (draft, pending_review,
-- approved, archived), as ingredients already do.
-- Runs in a single transaction (the migration runner wraps it).

-- 1. Columns ---------------------------------------------------------------

alter table public.product_benefits
  add column review_status public.content_status not null default 'draft',
  add column evidence_reference text,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz;

alter table public.product_faqs
  add column review_status public.content_status not null default 'draft',
  add column evidence_reference text,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz;

alter table public.products
  add column copy_status public.content_status not null default 'draft',
  add column copy_evidence_reference text,
  add column copy_reviewed_by uuid references auth.users (id) on delete set null,
  add column copy_reviewed_at timestamptz;

comment on column public.product_benefits.review_status is
  'Claim approval. Only approved rows are publicly readable (RLS).';
comment on column public.product_faqs.review_status is
  'Claim approval. Only approved rows are publicly readable (RLS).';
comment on column public.products.copy_status is
  'Approval of description/positioning. The storefront shows them only when approved.';

-- 2. Review bookkeeping -----------------------------------------------------
-- SECURITY INVOKER (default): runs as the admin making the change.

create or replace function private.claim_review_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'product_benefits' then
    if old.review_status = 'approved'
       and (new.title is distinct from old.title or new.body is distinct from old.body)
       and new.review_status = 'approved' then
      new.review_status := 'pending_review';
    end if;
  elsif tg_table_name = 'product_faqs' then
    if old.review_status = 'approved'
       and (new.question is distinct from old.question or new.answer is distinct from old.answer)
       and new.review_status = 'approved' then
      new.review_status := 'pending_review';
    end if;
  end if;

  if new.review_status = 'approved' and old.review_status is distinct from 'approved' then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create or replace function private.product_copy_review_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.copy_status = 'approved'
     and (new.description is distinct from old.description or new.positioning is distinct from old.positioning)
     and new.copy_status = 'approved' then
    new.copy_status := 'pending_review';
  end if;

  if new.copy_status = 'approved' and old.copy_status is distinct from 'approved' then
    new.copy_reviewed_by := (select auth.uid());
    new.copy_reviewed_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function private.claim_review_guard() from public, anon, authenticated;
revoke execute on function private.product_copy_review_guard() from public, anon, authenticated;

create trigger product_benefits_review_guard
  before update on public.product_benefits
  for each row execute function private.claim_review_guard();

create trigger product_faqs_review_guard
  before update on public.product_faqs
  for each row execute function private.claim_review_guard();

create trigger products_copy_review_guard
  before update of description, positioning, copy_status on public.products
  for each row execute function private.product_copy_review_guard();

-- 3. Public read: approved only --------------------------------------------
-- Staff policies (staff_*) are unchanged.

drop policy if exists public_read_product_benefits on public.product_benefits;
create policy public_read_product_benefits
  on public.product_benefits for select
  to anon, authenticated
  using (
    review_status = 'approved'
    and exists (
      select 1 from public.products p
      where p.id = product_benefits.product_id and p.status = 'active'
    )
  );

drop policy if exists public_read_product_faqs on public.product_faqs;
create policy public_read_product_faqs
  on public.product_faqs for select
  to anon, authenticated
  using (
    review_status = 'approved'
    and exists (
      select 1 from public.products p
      where p.id = product_faqs.product_id and p.status = 'active'
    )
  );

