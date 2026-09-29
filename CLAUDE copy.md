# CLAUDE.md — CNS Beauty Commerce

## 1. Project Identity

Project: `cns-beauty-commerce`
Brand: CNS Beauty Skincare by Wina Ranesa
Product: AI-native beauty commerce platform
Version baseline: v1.0
Frontend: Next.js 16 + TypeScript + App Router
Backend: Supabase PostgreSQL + Auth + Storage
Hosting: Vercel

## 2. Source of Truth

Development order of authority:

1. Approved CNS Beauty brand/product assets.
2. Approved product master and regulatory/content claims.
3. Founder-approved brand story.
4. `CNS_Beauty_Website_PRD_v1.0.md`.
5. `docs/FRONTEND_UI_SPEC.md`.
6. Reference illustrations.
7. Developer implementation choices.

Never silently invent product claims, prices, ingredients, certifications, regulatory status, testimonials, or customer data.

If source material is incomplete, implement an explicit placeholder/configuration point rather than fabricating facts.

## 3. Product Vision

CNS Beauty is not a generic e-commerce website.

It has three connected experience layers:

Brand Experience
- Story
- Education
- Journal
- Community

AI Beauty Experience
- Discover
- Consult
- Recommend
- Personalize

Commerce Experience
- Product
- Cart
- Checkout
- Order
- Loyalty

AI Beauty Concierge is a persistent interaction layer and must be accessible across the customer-facing experience.

## 4. Non-Negotiable Engineering Principles

- TypeScript strict mode.
- Server Components by default.
- Client Components only where interaction requires them.
- No secrets in browser code.
- Supabase RLS enabled for protected data.
- Backend/API is authoritative for price, inventory, cart totals, discount, shipping and order state.
- Zod validation at external boundaries.
- Explicit loading, empty, error and success states.
- WCAG 2.2 AA target.
- SEO-first marketing pages.
- Mobile-first responsive design.
- Analytics events are versioned and PII-minimized.
- Never expose internal AI chain-of-thought or hidden reasoning.
- AI recommendations must be grounded in approved product knowledge.
- AI must not bypass authorization.

## 5. Architecture

Browser
→ Next.js App Router
→ CNS API / Server Actions
→ Business Services
→ Supabase / AI Gateway

AI:
Frontend
→ AI API
→ Agent Orchestrator
→ RAG / Knowledge
→ LLM
→ Approved tools:
   Product
   Catalog
   Order
   Customer
   Routine
   Loyalty

## 6. State Management

Server state:
- TanStack Query where client-side caching is required.

UI state:
- Zustand.

Forms:
- React Hook Form + Zod.

URL state:
- Next.js searchParams.

AI state:
- dedicated AI conversation state.

Cart:
- Zustand may provide optimistic UI only.
- Supabase/backend remains authoritative.

## 7. Routes

Marketing:
/
 /produk
 /produk/[slug]
 /tentang-kami
 /manfaat
 /testimoni
 /artikel
 /artikel/[slug]
 /faq
 /reseller

AI:
 /beauty-concierge
 /skin-quiz

Commerce:
 /cart
 /checkout

Account:
 /account
 /account/orders
 /account/orders/[id]
 /account/wishlist
 /account/loyalty
 /account/skin-profile
 /account/routine
 /account/settings

Reseller:
 /reseller
 /reseller/products
 /reseller/orders
 /reseller/customers
 /reseller/commission
 /reseller/marketing
 /reseller/ai

Admin:
 /admin
 /admin/products
 /admin/inventory
 /admin/orders
 /admin/customers
 /admin/resellers
 /admin/ai
 /admin/knowledge
 /admin/content
 /admin/analytics
 /admin/audit-log

## 8. Design Direction

Visual concept:
Premium Feminine Beauty Editorial.

Primary visual language:
- warm cream
- blush pink
- soft peach
- cocoa/brown
- rose gold
- champagne gold
- restrained botanical accents

Typography:
- Display: Cormorant Garamond
- Body: Inter

Prioritize:
1. product photography
2. model/brand photography
3. typography
4. whitespace
5. consistent CTA hierarchy
6. AI interaction

Avoid generic SaaS/e-commerce visual patterns.

## 9. Product Claims Governance

Never hard-code unsupported claims.

Claims such as:
- BPOM Approved
- aman untuk semua jenis kulit
- hasil nyata & terbukti
- aman untuk kulit sensitif

must only be rendered when approved product data marks the claim as approved.

Suggested claim lifecycle:
DRAFT → EVIDENCE_REVIEW → APPROVED → PUBLISHED → EXPIRED/REVOKED

## 10. AI Rules

AI must:
- use page context;
- ground product answers in approved knowledge;
- distinguish product facts from general guidance;
- show uncertainty where evidence is insufficient;
- recommend products only from active catalog;
- never invent prices or stock;
- use backend tools for order/customer data;
- respect RLS/authorization;
- support human handoff.

Page context:
```ts
type PageContext = {
  pageType:
    | "home"
    | "shop"
    | "product"
    | "cart"
    | "checkout"
    | "account"
    | "reseller";
  productId?: string;
  categoryId?: string;
  orderId?: string;
  campaignId?: string;
};
```

## 11. Analytics

Use these event names:

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

Primary business funnel:
Visitor → Discovery → AI Engagement → Recommendation → Product View → Cart → Checkout → Payment → Order → Repeat Purchase

Primary AI KPI:
AI-assisted GMV.

## 12. Security

Never expose:
SUPABASE_SERVICE_ROLE_KEY
LLM_SECRET
PAYMENT_SECRET
WEBHOOK_SECRET
ADMIN_SECRET

Use server-side route handlers/services for sensitive operations.

## 13. Definition of Done

Every page:
- responsive
- authenticated/unauthenticated states where applicable
- loading state
- empty state
- error state
- success state
- accessibility
- analytics
- SEO metadata where applicable
- tests for critical behavior

AI-enabled page:
- contextual AI
- streaming
- recommendation card
- tool status
- fallback
- human handoff

## 14. Coding Workflow

Before coding:
1. Read relevant PRD/spec section.
2. Inspect existing repository.
3. Identify existing components before creating new ones.
4. Check database schema and generated types.
5. Implement smallest vertical slice.
6. Run typecheck/lint/test.
7. Verify responsive behavior.
8. Update documentation.

Never rewrite working modules unnecessarily.

## 15. Commit Discipline

Prefer small commits:
- feat(...)
- fix(...)
- refactor(...)
- docs(...)
- test(...)
- chore(...)

Do not mix unrelated changes.

## 16. Current Product Priority

P0:
Homepage → Product Listing → Product Detail → Cart → Checkout → Account → Basic AI

P1:
Skin Quiz → Beauty Concierge → Loyalty → Journal → Reseller

P2:
Voice AI → Personalized Routine → Predictive Reorder → AI Reseller Copilot → Agentic Commerce
