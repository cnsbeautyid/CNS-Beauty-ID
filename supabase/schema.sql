-- CNS Beauty Commerce — Supabase PostgreSQL Schema v1
-- Generated from CNS Beauty PRD v1.0.
-- Implementation note: names/types below are an implementation baseline.
-- Validate against the final commerce/payment provider contracts before production.

create extension if not exists pgcrypto;

-- =========================
-- ENUMS
-- =========================

do $$ begin
  create type public.user_role as enum (
    'customer','reseller','admin','super_admin','content_editor','customer_service'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft','active','inactive','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending','paid','processing','shipped','delivered','cancelled','refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending','initiated','paid','failed','expired','refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_status as enum (
    'draft','evidence_review','approved','published','expired','revoked'
  );
exception when duplicate_object then null; end $$;

-- =========================
-- PROFILES / RBAC
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- =========================
-- CATALOG
-- =========================

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  how_to_use text,
  price numeric(14,2) not null default 0 check (price >= 0),
  compare_at_price numeric(14,2) check (compare_at_price is null or compare_at_price >= 0),
  status public.product_status not null default 'draft',
  stock integer not null default 0 check (stock >= 0),
  rating numeric(3,2) check (rating is null or rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  image_type text not null default 'card'
    check (image_type in ('thumbnail','card','detail','zoom','social','hero')),
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_benefits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  benefit text not null,
  sort_order integer not null default 0
);

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient text not null,
  description text,
  sort_order integer not null default 0
);

create table if not exists public.product_skin_types (
  product_id uuid not null references public.products(id) on delete cascade,
  skin_type text not null,
  primary key (product_id, skin_type)
);

create table if not exists public.product_concerns (
  product_id uuid not null references public.products(id) on delete cascade,
  concern text not null,
  primary key (product_id, concern)
);

create table if not exists public.product_claims (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  claim text not null,
  claim_type text,
  evidence_reference text,
  status public.claim_status not null default 'draft',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_claims_status on public.product_claims(status);

-- =========================
-- INVENTORY
-- =========================

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  available_qty integer not null default 0 check (available_qty >= 0),
  reserved_qty integer not null default 0 check (reserved_qty >= 0),
  updated_at timestamptz not null default now()
);

-- =========================
-- CART
-- =========================

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  status text not null default 'active'
    check (status in ('active','converted','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_owner_check check (user_id is not null or session_id is not null)
);

create unique index if not exists idx_active_cart_user
  on public.carts(user_id) where status = 'active' and user_id is not null;

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(14,2) not null check (unit_price_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cart_id, product_id)
);

-- =========================
-- CUSTOMER / ADDRESS
-- =========================

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  province text not null,
  postal_code text not null,
  country text not null default 'ID',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- ORDERS / PAYMENTS
-- =========================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  shipping_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  shipping_address_snapshot jsonb not null,
  voucher_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'IDR',
  raw_reference jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_order on public.payments(order_id);

-- =========================
-- WISHLIST / REVIEWS
-- =========================

create table if not exists public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  is_verified_purchase boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- SKIN / ROUTINE
-- =========================

create table if not exists public.skin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  skin_type text,
  concerns text[] not null default '{}',
  sensitivity text,
  current_routine text[] not null default '{}',
  desired_result text,
  budget numeric(14,2),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skin_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  answers jsonb not null default '{}',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  source text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  step_order integer not null,
  usage_time text,
  instructions text,
  unique(routine_id, step_order)
);

-- =========================
-- LOYALTY
-- =========================

create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  points_balance bigint not null default 0 check (points_balance >= 0),
  tier text not null default 'bronze',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  points_delta bigint not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

-- =========================
-- AI
-- =========================

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  channel text not null default 'web',
  page_context jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  reason text,
  confidence numeric(5,4),
  accepted boolean,
  created_at timestamptz not null default now()
);

-- =========================
-- KNOWLEDGE / CONTENT
-- =========================

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null,
  source_reference text,
  content text not null,
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null,
  cover_image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- RESELLER
-- =========================

create table if not exists public.resellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  status text not null default 'pending'
    check (status in ('pending','active','suspended','rejected')),
  commission_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reseller_customers (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  customer_name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reseller_orders (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  commission_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- =========================
-- ANALYTICS / AUDIT
-- =========================

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  event_version integer not null default 1,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  session_id text,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_event_name on public.analytics_events(event_name);
create index if not exists idx_analytics_created_at on public.analytics_events(created_at);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- =========================
-- RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_benefits enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.product_skin_types enable row level security;
alter table public.product_concerns enable row level security;
alter table public.product_claims enable row level security;
alter table public.inventory enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.wishlists enable row level security;
alter table public.reviews enable row level security;
alter table public.skin_profiles enable row level security;
alter table public.skin_quiz_sessions enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.content_articles enable row level security;
alter table public.resellers enable row level security;
alter table public.reseller_customers enable row level security;
alter table public.reseller_orders enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

-- Helper functions

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','super_admin')
      and is_active = true
  );
$$;

create or replace function public.is_reseller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'reseller'
      and is_active = true
  );
$$;

-- Public catalog

create policy "public can view active categories"
on public.product_categories for select
using (is_active = true);

create policy "public can view active products"
on public.products for select
using (status = 'active');

create policy "public can view product images"
on public.product_images for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  )
);

create policy "public can view product benefits"
on public.product_benefits for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  )
);

create policy "public can view product ingredients"
on public.product_ingredients for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  )
);

create policy "public can view product skin types"
on public.product_skin_types for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  )
);

create policy "public can view product concerns"
on public.product_concerns for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  )
);

create policy "public can view approved product claims"
on public.product_claims for select
using (
  status = 'published'
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  )
);

-- Users own profile

create policy "users can view own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "users can update own profile"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Own customer data

create policy "users own addresses"
on public.shipping_addresses for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "users own wishlist"
on public.wishlists for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users own skin profile"
on public.skin_profiles for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users own quiz sessions"
on public.skin_quiz_sessions for all
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid() or user_id is null);

create policy "users own routines"
on public.routines for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users own loyalty"
on public.loyalty_accounts for select
using (user_id = auth.uid() or public.is_admin());

create policy "users own loyalty transactions"
on public.loyalty_transactions for select
using (
  exists (
    select 1 from public.loyalty_accounts la
    where la.id = loyalty_account_id
      and (la.user_id = auth.uid() or public.is_admin())
  )
);

-- Orders/payments read-only for owners; mutations should be server-side.

create policy "users view own orders"
on public.orders for select
using (user_id = auth.uid() or public.is_admin());

create policy "users view own order items"
on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

create policy "users view own payments"
on public.payments for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

-- Reviews

create policy "public view published reviews"
on public.reviews for select
using (is_published = true or user_id = auth.uid() or public.is_admin());

create policy "users create own reviews"
on public.reviews for insert
with check (user_id = auth.uid());

create policy "users update own reviews"
on public.reviews for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- AI conversations

create policy "users view own ai conversations"
on public.ai_conversations for select
using (user_id = auth.uid() or user_id is null or public.is_admin());

create policy "users view own ai messages"
on public.ai_messages for select
using (
  exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id
      and (c.user_id = auth.uid() or c.user_id is null or public.is_admin())
  )
);

create policy "users view own recommendations"
on public.ai_recommendations for select
using (user_id = auth.uid() or public.is_admin());

-- Articles

create policy "public view published articles"
on public.content_articles for select
using (status = 'published' or public.is_admin());

-- Reseller

create policy "reseller sees own profile"
on public.resellers for select
using (user_id = auth.uid() or public.is_admin());

create policy "reseller sees own customers"
on public.reseller_customers for all
using (
  exists (
    select 1 from public.resellers r
    where r.id = reseller_id
      and (r.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.resellers r
    where r.id = reseller_id
      and (r.user_id = auth.uid() or public.is_admin())
  )
);

create policy "reseller sees own orders"
on public.reseller_orders for select
using (
  exists (
    select 1 from public.resellers r
    where r.id = reseller_id
      and (r.user_id = auth.uid() or public.is_admin())
  )
);

-- Analytics insert can be routed through server-side API.
-- Avoid granting broad client-side access to sensitive analytics.
create policy "authenticated can insert analytics"
on public.analytics_events for insert
with check (user_id = auth.uid() or user_id is null);

-- Admin write policies

create policy "admins manage categories"
on public.product_categories for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage products"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage product images"
on public.product_images for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage benefits"
on public.product_benefits for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage ingredients"
on public.product_ingredients for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage claims"
on public.product_claims for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage inventory"
on public.inventory for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage articles"
on public.content_articles for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage knowledge"
on public.knowledge_documents for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins view audit logs"
on public.audit_logs for select
using (public.is_admin());

-- NOTE:
-- Checkout/order creation, payment confirmation, inventory reservation,
-- voucher validation and loyalty mutations should be implemented as
-- server-side transactional services/RPCs rather than trusting the browser.
