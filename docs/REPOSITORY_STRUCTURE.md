# CNS Beauty Commerce — Repository Structure

```text
cns-beauty-commerce/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── produk/
│   │   ├── tentang-kami/
│   │   ├── manfaat/
│   │   ├── testimoni/
│   │   ├── artikel/
│   │   ├── faq/
│   │   └── reseller/
│   ├── (commerce)/
│   │   ├── cart/
│   │   └── checkout/
│   ├── (ai)/
│   │   ├── beauty-concierge/
│   │   └── skin-quiz/
│   ├── account/
│   │   ├── page.tsx
│   │   ├── orders/
│   │   ├── wishlist/
│   │   ├── loyalty/
│   │   ├── skin-profile/
│   │   ├── routine/
│   │   └── settings/
│   ├── reseller/
│   │   ├── page.tsx
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── commission/
│   │   ├── marketing/
│   │   └── ai/
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── resellers/
│   │   ├── ai/
│   │   ├── knowledge/
│   │   ├── content/
│   │   ├── analytics/
│   │   └── audit-log/
│   └── api/
│       ├── ai/
│       ├── products/
│       ├── cart/
│       ├── checkout/
│       ├── orders/
│       ├── payments/
│       ├── loyalty/
│       ├── analytics/
│       └── webhooks/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── product/
│   ├── ai/
│   ├── commerce/
│   ├── customer/
│   ├── reseller/
│   └── admin/
├── features/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── loyalty/
│   ├── skin/
│   ├── ai/
│   ├── reseller/
│   └── content/
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── api/
│   ├── ai/
│   ├── payments/
│   ├── analytics/
│   └── utils/
├── services/
│   ├── catalog/
│   ├── commerce/
│   ├── customer/
│   ├── loyalty/
│   ├── reseller/
│   └── ai/
├── stores/
│   ├── ui-store.ts
│   ├── cart-store.ts
│   └── ai-store.ts
├── schemas/
│   ├── product.ts
│   ├── cart.ts
│   ├── checkout.ts
│   ├── skin-quiz.ts
│   └── ai.ts
├── types/
│   ├── database.ts
│   ├── product.ts
│   ├── commerce.ts
│   └── ai.ts
├── constants/
│   ├── routes.ts
│   ├── analytics.ts
│   └── claims.ts
├── public/
│   ├── brand/
│   ├── products/
│   └── icons/
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── schema.sql
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── PRD.md
│   ├── FRONTEND_UI_SPEC.md
│   ├── DESIGN_SYSTEM.md
│   ├── ARCHITECTURE.md
│   └── API_CONTRACTS.md
├── prompts/
│   └── MASTER_PROMPT_CLAUDE_CODE.md
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── .env.example
```

## Architectural Rules

### app/
Routing and page composition only. Keep business logic outside route files.

### components/
Reusable UI components. No direct database mutation logic.

### features/
Domain-specific UI and orchestration.

### services/
Business logic and integrations.

### lib/
Infrastructure adapters and utilities.

### schemas/
Zod schemas for external input validation.

### stores/
Client-only state.

### supabase/
Database migrations, seed and schema.

### tests/
Critical commerce and AI journeys.

## Naming

- Components: PascalCase.
- Hooks: `useX`.
- Stores: `x-store.ts`.
- Services: domain-oriented.
- Schemas: singular domain name.
- Routes: lowercase kebab-case where applicable.

## Dependency Direction

```text
app
 ↓
features/components
 ↓
services
 ↓
lib/adapters
 ↓
external systems
```

UI must not directly import server secrets or payment SDK credentials.
