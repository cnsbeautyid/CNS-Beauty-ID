# CNS Beauty Commerce — Architecture & Status

Living document. Updated at the end of every phase.

- **Last updated:** 2026-09-29 (Phase 0)
- **Current phase:** Phase 0 Foundation, done and validated
- **Next phase:** Phase 1 Design System (blocked items: see §6)

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
| 1 Design System | Logo (SVG); confirm the color layering in §4; `docs/CNS_BEAUTY_MOTION_SYSTEM.md` (referenced by CLAUDE.md, doesn't exist yet) |
| 2 Homepage | Hero photography (model plus products); approved hero/benefit copy; testimonials, if any |
| 4 Catalog | **Product master data**; Supabase project; DB hardening migration (§2) |
| 7 Checkout | Payment provider (e.g. Midtrans/Xendit) and shipping provider |
| 9 AI Concierge | LLM provider and data-processing terms |
| 10 RAG | Approved knowledge sources |

## 7. Validation log

| Phase | lint | typecheck | unit | build | e2e |
|---|---|---|---|---|---|
| 0 | pass | pass | 14/14 | pass | 11 pass, 1 skipped (keyboard test runs desktop-only) |
