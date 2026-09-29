# CNS Beauty Commerce — Engineering Constitution

## 1. Product Context

CNS Beauty is a premium beauty commerce platform built around three experience layers:

1. Brand Experience — story, education, journal, community
2. AI Beauty Experience — discover, consult, recommend, personalize
3. Commerce Experience — product, cart, checkout, order, loyalty

The AI Beauty Concierge is a persistent interaction layer and the primary discovery/consultation interface. It is not merely a decorative chatbot.

## 2. Technology Baseline

- Next.js App Router
- TypeScript strict
- Supabase
- Vercel
- Tailwind CSS
- Motion for React (`motion`)
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Supabase Auth
- SSE/streaming for AI responses

Do not introduce another framework or state-management library unless there is a documented architectural reason.

## 3. Repository Principles

Before modifying code:

1. Inspect the existing repository.
2. Read this file.
3. Read the relevant skill under `.claude/skills/`.
4. Read the relevant specification under `docs/`.
5. Reuse existing components/services before creating new ones.
6. Make the smallest coherent change that satisfies the requirement.

Never rewrite working architecture without a clear reason.

## 4. Rendering Architecture

Use Server Components by default.

Use Client Components only when required for:

- user interaction
- browser APIs
- interactive filters
- cart interactions
- checkout interactions
- AI chat/streaming
- interactive Skin Quiz
- account/reseller interactions
- client-side animation requiring state

Keep marketing, product, category, journal and SEO content server-rendered where practical.

## 5. State Architecture

Keep three categories separate:

### Server State
- Supabase/API data
- TanStack Query cache

### UI State
- Zustand
- modal/drawer/menu/filter state

### AI State
- conversation
- messages
- intent
- confidence
- recommendations
- streaming/tool state

The frontend cart is not the authoritative source of truth. Backend quote/cart data is authoritative.

## 6. CNS Beauty Design System

Follow the centralized CNS Beauty design tokens.

### Color

- Primary: `#1F1F1F`
- Secondary: `#F5F1EC`
- Background: `#FFFFFF`
- Surface: `#FAF9F7`
- Text primary: `#1F1F1F`
- Text secondary: `#6B6863`
- Text muted: `#9B9893`
- Border: `#E7E2DC`
- Success: `#3F6B50`
- Warning: `#A97832`
- Error: `#B84A4A`
- AI surface: `#F3F0EA`
- AI accent: `#8C7A64`

### Typography

- Display: `Cormorant Garamond`
- Body: `Inter`

### Radius

- sm: 6px
- md: 10px
- lg: 16px
- xl: 24px
- pill: 999px

Avoid excessive rounding.

### Spacing

Use a 4px base unit and centralized spacing tokens.

### Visual Direction

Premium beauty:
- editorial
- elegant
- minimal
- high whitespace
- restrained shadows
- strong imagery
- readable typography
- subtle interaction

Do not use arbitrary colors, typography, spacing or shadows.

## 7. Motion

All meaningful UI animation must follow:

`docs/CNS_BEAUTY_MOTION_SYSTEM.md`

Motion must:
- communicate hierarchy
- reinforce interaction
- remain subtle
- respect reduced motion
- avoid blocking content
- avoid unnecessary animation
- preserve performance

Never expose internal AI reasoning through animation or UI copy.

## 8. AI Beauty Concierge

AI is contextual.

Page context may include:
- pageType
- productId
- categoryId
- orderId
- campaignId

Page context is NOT authorization context.

On product pages, the AI assistant should receive the current product context without requiring the customer to repeat it.

AI UI should support:
- streaming
- thinking indicator
- tool status
- recommendation cards
- confidence where appropriate
- error fallback
- human handoff
- accessible live messages

Do not expose chain-of-thought or internal reasoning.

## 9. Commerce Security

Never expose client-side:
- `SUPABASE_SERVICE_ROLE_KEY`
- LLM secrets
- payment secrets
- webhook secrets
- admin secrets

Sensitive flow:

Browser
→ Next.js API/server action
→ authorization
→ business service
→ Supabase/provider

Frontend must not calculate authoritative checkout totals. Display backend quote results.

## 10. Accessibility

Target WCAG 2.2 AA.

Every interactive experience must consider:
- semantic HTML
- keyboard navigation
- visible focus
- accessible modal/drawer
- ARIA labels
- contrast
- alt text
- screen readers
- reduced motion

AI streaming messages should use an appropriate polite live-region strategy.

## 11. Responsive Rules

Breakpoints from the CNS frontend specification:

- Mobile: `<640px`
- Tablet: `640–1023px`
- Desktop: `1024–1439px`
- Large desktop: `>=1440px`

Product grid:
- mobile: 2 columns
- tablet: 3 columns
- desktop: 4 columns
- large desktop: 4–5 columns

Do not depend on hover for essential mobile interactions.

## 12. SEO

Marketing/product/content pages should remain SEO-first.

Use:
- metadata
- Open Graph
- structured data
- Product schema
- Breadcrumb schema
- canonical URL
- sitemap
- robots
- semantic headings

AI chat does not replace indexable SEO content.

## 13. Image Strategy

Use:
- `next/image`
- responsive sizes
- WebP/AVIF where supported
- lazy loading
- priority only above the fold

Do not ship original-resolution assets unnecessarily.

## 14. Analytics

Use the CNS event vocabulary consistently, including:

- `PAGE_VIEWED`
- `PRODUCT_VIEWED`
- `PRODUCT_SEARCHED`
- `PRODUCT_RECOMMENDATION_VIEWED`
- `AI_OPENED`
- `AI_MESSAGE_SENT`
- `AI_RECOMMENDATION_ACCEPTED`
- `ADD_TO_CART`
- `REMOVE_FROM_CART`
- `CHECKOUT_STARTED`
- `PAYMENT_STARTED`
- `ORDER_CREATED`
- `ORDER_DELIVERED`
- `REVIEW_CREATED`
- `SKIN_QUIZ_STARTED`
- `SKIN_QUIZ_COMPLETED`
- `LOYALTY_VIEWED`
- `VOUCHER_APPLIED`
- `RESELLER_AI_USED`

Events must be anonymous-safe, PII-minimized and versioned.

## 15. Required UI States

Every data-driven page/component must account for:

- loading
- empty
- error
- success

Critical journeys must include failure states.

## 16. Definition of Done

A feature is complete only when applicable items below are satisfied:

### Functional
- responsive
- API integrated
- loading state
- empty state
- error state
- authentication state
- authorization state

### UI
- design tokens
- typography
- spacing
- responsive behavior
- accessibility
- keyboard navigation

### AI-enabled
- contextual AI
- streaming
- recommendation card
- tool status
- error fallback
- human handoff

### Technical
- TypeScript strict
- Zod validation
- no secrets client-side
- analytics events
- unit tests
- integration tests where applicable
- E2E coverage for critical paths
- successful production build

## 17. Priority

P0:
- Homepage
- Shop
- Product Detail
- Cart
- Checkout
- Account
- AI Chat

P1:
- Skin Quiz
- Beauty Concierge
- Loyalty
- Journal
- Reseller Portal

P2:
- Voice AI
- Personalized Routine
- Predictive Reorder
- AI Reseller Copilot
- Agentic Commerce

## 18. Working Method

For each task:

1. Understand requirement.
2. Identify affected architecture.
3. Inspect existing implementation.
4. State a concise implementation plan.
5. Implement incrementally.
6. Run typecheck/lint/tests/build as relevant.
7. Verify responsive and accessibility behavior.
8. Review for unnecessary dependencies and duplicated components.
9. Summarize files changed, validation performed and remaining risks.

Do not claim a feature is complete if validation was not performed.
