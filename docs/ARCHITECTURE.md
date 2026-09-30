# CNS Beauty Commerce — Architecture & Status

Living document. Updated at the end of every phase.

- **Last updated:** 2026-09-30 (Phase 8)
- **Current phase:** Phase 8 Customer Account, done and validated
- **Next phase:** Phase 9 AI Beauty Concierge (streaming chat, controlled tools)

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
4. **Medium:** `analytics_events` accepts arbitrary anonymous inserts. Route
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
