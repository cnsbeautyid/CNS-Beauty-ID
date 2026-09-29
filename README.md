# CNS Beauty Commerce — Master Development Specification

This package is the implementation baseline for `cns-beauty-commerce`.

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

Status, decisions, gap analysis and open prerequisites: `docs/ARCHITECTURE.md`.
Token usage and contrast rules: `docs/DESIGN_TOKENS.md`.
