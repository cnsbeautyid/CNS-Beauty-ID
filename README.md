# CNS Beauty Commerce — Master Development Specification

This package is the implementation baseline for `cns-beauty-commerce`.

## Status

Phases 0–21 of the master prompt are done and merged into `main`:

- **Foundation and storefront:** homepage, brand pages, catalog, product detail, cart, login-required checkout with manual bank transfer, and customer account.
- **AI:** Beauty Concierge (streaming, grounded tools, knowledge base) and the full-page `/beauty-concierge`.
- **Customer features:** Skin Quiz, routines, CNS Rewards loyalty, and the reseller programme with a partner portal.
- **Admin:** the staff admin area with an audit log.
- **Analytics:** first-party analytics with 180-day retention.
- **SEO:** robots, sitemap, structured data, `/faq` and `/kontak`.
- **Performance:** first-load JS of about 210 kB, with a budget test.
- **Accessibility:** WCAG 2.2 AA fixes, with guards.

**Next:** Phase 22, E2E testing with a local Supabase stack and test accounts for signed-in flows; then production hardening.

Per-phase decisions, validation results and open items: `docs/ARCHITECTURE.md`.

## Deploy (Vercel)

1. **Create the Vercel project.** Create a Vercel project from this repository with the Next.js preset; `vercel.json` already defines the two daily cron jobs. Production deploys come from `main`.
2. **Set the Production environment variables:**

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | yes | The public domain, e.g. `https://cnsbeauty.id`. Production builds **fail on purpose** if it is missing or `localhost`. Canonicals, the sitemap and sign-up email links use it. |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Public values. Product images are only allowed from this Supabase URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Used by analytics, cron jobs, coupons and admin actions. |
   | `CRON_SECRET` | yes | Without it the nightly jobs (order expiry, analytics retention) refuse to run. |
   | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | optional | Beauty AI. Without them the concierge says it is unavailable and offers WhatsApp. |
   | `ENABLE_DESIGN_PREVIEW` | — | Leave **unset** in production. |

3. **Configure Supabase Auth** (URL Configuration): set the Site URL to the production domain, and allow `https://<domain>/auth/callback` as a redirect URL.
4. **After the first deploy:**
   - check that `/robots.txt` allows crawling and lists the sitemap;
   - submit `/sitemap.xml` in Google Search Console;
   - check the next day's logs for a `200` from `/api/cron/expire-orders` and `/api/cron/analytics-retention`.

## Contents

- `CLAUDE.md` — persistent engineering rules for Claude Code.
- `supabase/schema.sql` — PostgreSQL schema + initial RLS policies.
- `docs/PRD.md` — master product requirements specification.
- `docs/FRONTEND_UI_SPEC.md` — frontend/UI source specification.
- `docs/DESIGN_SYSTEM.md` — visual system.
- `docs/REPOSITORY_STRUCTURE.md` — Next.js 16 repository architecture.
- `prompts/MASTER_PROMPT_CLAUDE_CODE.md` — phased master prompt for Claude Code.

## How to use

1. Create/clone repository `cns-beauty-commerce`.
2. Copy these files into the repository root.
3. Put the approved CNS Beauty assets under `public/brand` and `public/products`.
4. Configure Supabase.
5. Run the schema through Supabase migrations after reviewing provider-specific requirements.
6. Open the repository with Claude Code.
7. Ask Claude Code to read `CLAUDE.md` and execute the master prompt phase-by-phase.
8. Do not skip validation gates between phases.

## Important

The SQL schema is an implementation baseline, not a substitute for production security review.

The product reference imagery contains claims and product information that must be validated against the approved CNS Beauty product master before publishing.

The visual design should follow the supplied reference illustrations while keeping approved product assets and official brand guidelines as the ultimate visual source of truth.

## Development

Requires Node 22+.

```bash
npm install
cp .env.example .env.local   # optional until Supabase is linked
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm run typecheck` | Route type generation + `tsc --noEmit` (strict) |
| `npm run test` | Unit/integration tests (Vitest) |
| `npm run test:e2e` | Playwright on a production build (desktop + mobile) |
| `npm run validate` | lint + typecheck + test + build — the phase gate |

### CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

- **checks**: `npm ci`, lint, typecheck, unit/integration tests, production build.
- **e2e**: Playwright (desktop + mobile), after `checks` passes. It runs against the live Supabase catalog, so it is skipped until these **repository variables** exist (Settings → Secrets and variables → Actions → Variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and, optionally, `NEXT_PUBLIC_SITE_URL`. Both are public client values. Never add the service role key, LLM keys or payment secrets to CI.

On failure, Playwright traces are uploaded as the `playwright-results` artifact.

Status, decisions, gap analysis and open prerequisites: `docs/ARCHITECTURE.md`.
Token usage and contrast rules: `docs/DESIGN_TOKENS.md`.
