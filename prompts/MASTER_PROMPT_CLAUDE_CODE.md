# MASTER PROMPT — Claude Code
## CNS Beauty Commerce v1.0

You are the principal software architect and senior full-stack engineer responsible for building `cns-beauty-commerce`.

Your mission is to implement the CNS Beauty Website as an AI-native beauty commerce platform using the attached/available master specifications.

---

## A. AUTHORITATIVE SPECIFICATIONS

Read these before modifying code:

1. `CLAUDE.md`
2. `docs/PRD.md`
3. `docs/FRONTEND_UI_SPEC.md`
4. `docs/DESIGN_SYSTEM.md`
5. `docs/REPOSITORY_STRUCTURE.md`
6. `supabase/schema.sql`

Do not replace these specifications with assumptions.

If there is a conflict:
- approved product/brand data wins;
- PRD wins over implementation convenience;
- security wins over speed;
- backend authoritative state wins over client state.

---

## B. PROJECT GOAL

Build:

> CNS Beauty — Premium Feminine AI-Native Beauty Commerce

The website must connect:

Brand → AI Consultation → Product Discovery → Commerce → Customer Data → Loyalty → Repeat Purchase.

AI Beauty Concierge is a first-class interaction layer.

---

## C. TECHNICAL BASELINE

Use:

- Next.js 16
- TypeScript strict
- App Router
- React
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel
- TanStack Query where required
- Zustand for UI/client state
- React Hook Form
- Zod
- Vitest/Jest equivalent for unit tests
- Playwright for E2E

Do not introduce a competing architecture unless explicitly justified.

---

## D. IMPLEMENTATION MODE

Work incrementally.

For each phase:

1. Inspect current repository.
2. Identify what already exists.
3. Read relevant specification.
4. Create/update migration.
5. Implement service layer.
6. Implement UI.
7. Add states.
8. Add analytics.
9. Add tests.
10. Run validation.
11. Report changed files and remaining risks.

Never rewrite the whole repository to solve a local issue.

---

# PHASE 0 — REPOSITORY FOUNDATION

Create/verify:

- Next.js 16 application.
- TypeScript strict.
- Tailwind.
- ESLint.
- Prettier if already adopted.
- Supabase client architecture.
- environment validation.
- route groups.
- design tokens.
- base UI primitives.
- CI/build configuration.

Required `.env.example` categories:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_GATEWAY_URL=
AI_GATEWAY_API_KEY=
PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=
```

Never expose server-only values through `NEXT_PUBLIC_*`.

---

# PHASE 1 — DESIGN SYSTEM

Implement:

- CNS color tokens.
- Cormorant Garamond.
- Inter.
- spacing.
- radius.
- shadows.
- buttons.
- cards.
- badges.
- inputs.
- modal.
- drawer.
- tabs.
- toast.
- skeleton.
- empty state.
- error state.

Build:

```text
Header
AnnouncementBar
Footer
PageContainer
Section
MobileNavigation
AI Launcher
```

Validate mobile and desktop.

---

# PHASE 2 — BRAND EXPERIENCE

Implement:

## Homepage

Sections:

1. Header.
2. Hero.
3. USP/trust strip.
4. Shop by concern.
5. Featured products.
6. AI Beauty Experience.
7. Founder story.
8. Testimonials.
9. Articles.
10. Footer.

Hero direction:

- supplied CNS model/reference photography;
- product photography;
- blush/peach/cream;
- rose-gold/gold;
- floral/botanical;
- premium editorial typography.

Do not fabricate claims.

## About

Use founder-approved narrative.

## Benefits

Map concerns → desired result → approved products.

## Testimonials

Only approved customer content.

## Articles

SEO-ready content system.

---

# PHASE 3 — PRODUCT CATALOG

Implement database and UI:

- categories;
- products;
- images;
- benefits;
- ingredients;
- skin types;
- concerns;
- claims;
- inventory.

Seed only approved/known product data.

Initial visual product set:

- Serum DNA Salmon.
- Licore Moisturizer Skin Glow.
- Brightening Face Mist.
- Glow Routine.

Do not invent missing:
- SKU;
- price;
- ingredients;
- BPOM number;
- claims;
- stock.

Use placeholders/configuration for missing data.

---

# PHASE 4 — SHOP

Implement:

- product listing;
- search;
- category;
- concern filter;
- skin type filter;
- price filter;
- sort;
- pagination;
- responsive grid.

Desktop:
4 columns.

Tablet:
3.

Mobile:
2.

Product Card:

```text
image
badge
brand
name
benefit
rating
price
CTA
```

---

# PHASE 5 — PRODUCT DETAIL

Implement:

- gallery;
- product info;
- price;
- benefits;
- ingredients;
- how-to-use;
- skin type;
- concern;
- reviews;
- related products;
- AI Product Assistant.

AI receives:

```json
{
  "pageType": "product",
  "productId": "...",
  "categoryId": "..."
}
```

AI must not claim facts not present in approved product knowledge.

---

# PHASE 6 — CART

Implement authoritative backend cart.

Client store is optimistic only.

Required:

- add;
- remove;
- update quantity;
- cart drawer;
- voucher;
- subtotal;
- shipping;
- discount;
- total.

Never trust client-submitted totals.

---

# PHASE 7 — CHECKOUT

Implement:

1. Address.
2. Shipping.
3. Voucher.
4. Payment.
5. Confirmation.

Backend calculates final quote.

State:

```text
IDLE
LOADING_QUOTE
QUOTE_READY
PAYMENT_INITIATED
PAYMENT_PENDING
PAYMENT_CONFIRMED
ORDER_CREATED
```

Handle:

```text
PAYMENT_FAILED
PAYMENT_EXPIRED
CHECKOUT_CONFLICT
INVENTORY_UNAVAILABLE
```

Payment provider must be abstracted behind a service interface.

---

# PHASE 8 — ACCOUNT

Implement:

- dashboard;
- orders;
- order detail;
- wishlist;
- loyalty;
- skin profile;
- routine;
- settings.

Order data is always scoped to the authenticated user.

---

# PHASE 9 — AI BEAUTY CONCIERGE

Build:

```text
AI API
↓
Conversation Service
↓
Intent
↓
Knowledge Retrieval
↓
Tool Selection
↓
LLM
↓
Streaming Response
```

Tools initially:

- search products;
- get product details;
- recommend products;
- create routine;
- get order status;
- get loyalty balance.

AI states:

```text
idle
thinking
streaming
tool_running
handoff
error
```

Do not expose chain-of-thought.

Show user-facing status only:
“Sedang mencari rekomendasi...”

---

# PHASE 10 — RAG / KNOWLEDGE

Knowledge sources:

- approved product catalog;
- approved product claims;
- approved ingredients;
- approved how-to-use;
- approved FAQ;
- approved brand story;
- approved articles.

Retrieval must prioritize product-specific evidence.

When evidence is insufficient:

> “Saya belum menemukan informasi yang cukup untuk memastikan hal tersebut.”

Do not hallucinate.

---

# PHASE 11 — SKIN QUIZ

Six-step baseline:

1. Skin type.
2. Main concern.
3. Sensitivity.
4. Current routine.
5. Desired result.
6. Budget/preference.

Output:

```text
Skin Profile
↓
Recommended Products
↓
Recommended Routine
↓
Add Routine to Cart
```

Persist authenticated profiles to Supabase.

---

# PHASE 12 — LOYALTY

Implement:

- points account;
- transaction ledger;
- tier;
- rewards;
- history.

Points mutations must be server-side and auditable.

---

# PHASE 13 — RESELLER

Implement:

- dashboard;
- products;
- orders;
- customers;
- commission;
- marketing assets;
- AI Assistant.

AI reseller tools:

- recommend product;
- customer consultation;
- sales pitch;
- marketing copy;
- commission lookup.

Respect reseller authorization boundaries.

---

# PHASE 14 — ADMIN

Implement:

- dashboard;
- products;
- inventory;
- orders;
- customers;
- resellers;
- AI;
- knowledge;
- content;
- analytics;
- audit log.

All admin mutation endpoints must verify role server-side.

---

# PHASE 15 — ANALYTICS

Implement event tracking:

```text
PAGE_VIEWED
PRODUCT_VIEWED
PRODUCT_SEARCHED
PRODUCT_RECOMMENDATION_VIEWED
AI_OPENED
AI_MESSAGE_SENT
AI_RECOMMENDATION_ACCEPTED
ADD_TO_CART
REMOVE_FROM_CART
CHECKOUT_STARTED
PAYMENT_STARTED
ORDER_CREATED
ORDER_DELIVERED
REVIEW_CREATED
SKIN_QUIZ_STARTED
SKIN_QUIZ_COMPLETED
LOYALTY_VIEWED
VOUCHER_APPLIED
RESELLER_AI_USED
```

Measure:

- conversion;
- AOV;
- repeat purchase;
- AI-assisted GMV;
- AI recommendation acceptance;
- skin quiz completion;
- reseller GMV.

Minimize PII.

---

# PHASE 16 — SEO

Implement:

- metadata;
- canonical;
- Open Graph;
- sitemap;
- robots;
- Product schema;
- Breadcrumb schema;
- semantic heading structure.

Marketing pages must be indexable.

AI is not a substitute for SEO content.

---

# PHASE 17 — PERFORMANCE

Targets:

LCP < 2.5s
CLS < 0.1
INP < 200ms
Product API p95 < 500ms
Cart API p95 < 500ms
AI first token < 2s

Use:

- next/image;
- WebP/AVIF;
- lazy loading;
- server components;
- streaming where appropriate;
- limited client JS.

---

# PHASE 18 — ACCESSIBILITY

Target WCAG 2.2 AA.

Verify:

- keyboard;
- focus;
- semantic HTML;
- ARIA;
- modal;
- drawer;
- contrast;
- reduced motion;
- alt text;
- screen reader AI messages.

---

# PHASE 19 — E2E

Minimum journeys:

### Discovery → Purchase
Home → Shop → Product → Cart → Checkout → Payment → Confirmation

### AI → Purchase
Home → AI → Consultation → Recommendation → Product → Cart → Checkout

### Existing Customer
Login → Account → AI Recommendation → Reorder → Checkout

### Reseller
Login → Dashboard → AI → Customer → Recommendation → Sale → Commission

---

# PHASE 20 — FINAL QUALITY GATE

Before declaring release:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- E2E critical paths
- responsive check
- accessibility check
- SEO check
- security review
- RLS review
- secret scan
- claim/content review

Release only when all P0 acceptance criteria pass.

---

## CODING RULE

When asked to implement a feature, do not answer with a plan only.

Inspect → implement → validate → summarize.

If a requirement is ambiguous:
- use the existing specifications;
- make the smallest safe assumption;
- document the assumption;
- do not fabricate business facts.

## OUTPUT FORMAT AFTER EACH IMPLEMENTATION TASK

Return:

### Implemented
- ...

### Files Changed
- ...

### Database
- ...

### Tests
- ...

### Validation
- ...

### Remaining Risks / Decisions
- ...

