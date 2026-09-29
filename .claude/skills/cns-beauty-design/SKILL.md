---
name: cns-beauty-design
description: Apply the CNS Beauty premium beauty design system, UX patterns, responsive rules, accessibility standards and Motion principles when designing or implementing CNS Beauty UI.
---

# CNS Beauty Design Skill

## Purpose

Use this skill whenever creating, modifying, reviewing or refactoring CNS Beauty UI/UX.

The goal is a coherent premium beauty experience, not generic ecommerce UI.

## Design Direction

CNS Beauty combines:

- Premium Beauty
- Editorial aesthetics
- AI-Native Commerce
- Personalized beauty consultation
- Low-friction commerce

The design should feel:
- sophisticated
- calm
- trustworthy
- modern
- premium
- human

Avoid:
- generic SaaS aesthetics
- excessive gradients
- excessive glassmorphism
- oversized rounded cards
- heavy shadows
- excessive animation
- visually noisy dashboards

## Experience Architecture

Think in three layers:

Brand
→ story / education / journal / community

AI Beauty
→ discover / consult / recommend / personalize

Commerce
→ product / cart / checkout / order / loyalty

AI Beauty Concierge should remain easy to access across the customer experience.

## Design Tokens

Use these centralized values.

### Colors

```css
--color-primary: #1F1F1F;
--color-secondary: #F5F1EC;
--color-background: #FFFFFF;
--color-surface: #FAF9F7;
--color-text-primary: #1F1F1F;
--color-text-secondary: #6B6863;
--color-text-muted: #9B9893;
--color-border: #E7E2DC;
--color-success: #3F6B50;
--color-warning: #A97832;
--color-error: #B84A4A;
--color-ai-surface: #F3F0EA;
--color-ai-accent: #8C7A64;
```

### Typography

```css
--font-display: "Cormorant Garamond", serif;
--font-body: "Inter", sans-serif;
```

Desktop:
- Display XL: 64px
- Display L: 52px
- H1: 44px
- H2: 36px
- H3: 28px
- H4: 22px
- Body L: 18px
- Body: 16px
- Body S: 14px
- Caption: 12px

Mobile:
- Display: 40px
- H1: 32px
- H2: 28px
- H3: 22px
- Body: 16px

### Radius

- sm 6px
- md 10px
- lg 16px
- xl 24px
- pill 999px

Use restrained rounding.

### Spacing

Base unit: 4px.

Prefer centralized spacing tokens.

Section spacing:
- mobile: 64px
- desktop: 96–128px

## Component Rules

Prefer reusable primitives:

- Button
- Input
- Select
- Checkbox
- Radio
- Modal
- Drawer
- Tabs
- Toast
- Badge
- Card
- Avatar
- Dropdown
- Pagination
- Skeleton
- EmptyState
- ErrorState

Product components:

- ProductCard
- ProductGrid
- ProductGallery
- ProductPrice
- ProductBadge
- ProductRating
- ProductVariantSelector
- ProductBenefitList
- IngredientList
- UsageGuide
- RelatedProducts
- AIProductAssistant

AI components:

- AIAvatar
- AIChatWindow
- AIMessage
- AIInput
- AIRecommendationCard
- AIProductCarousel
- AIThinkingIndicator
- AIToolStatus
- AIConfidenceIndicator
- HumanHandoff
- VoiceControl

## Product Card

Desktop hover may use:
- image scale ~1.03
- subtle quick action
- contextual AI CTA

Never make hover essential.

Mobile must work without hover.

## AI Interaction

Desktop:
- floating panel or side panel

Mobile:
- floating button
- bottom sheet or full-screen conversation

AI recommendations should use product cards, not walls of text.

AI should understand page context, but page context must never be treated as authorization.

## Product Detail

Desktop:
Gallery | Product Information

Mobile:
Gallery
→ information
→ price
→ sticky Add to Cart

Include:
- product benefits
- variant selection
- reviews
- ingredients
- usage
- related products
- contextual AI assistant

## Checkout

Keep checkout linear and low-friction.

Authoritative totals come from backend quote data. Frontend presents the result.

## Accessibility

Target WCAG 2.2 AA.

Required:
- semantic HTML
- keyboard navigation
- visible focus
- accessible modals/drawers
- sufficient contrast
- ARIA where necessary
- alt text
- screen-reader support
- reduced-motion support

## Responsive

- mobile `<640px`
- tablet `640–1023px`
- desktop `1024–1439px`
- large desktop `>=1440px`

Product grid:
- mobile 2
- tablet 3
- desktop 4
- large desktop 4–5

## Motion

Use Motion for React.

Animation should:
- reinforce hierarchy
- communicate state
- guide attention
- remain subtle
- respect reduced motion

Always consult:
`docs/CNS_BEAUTY_MOTION_SYSTEM.md`

## Implementation Rules

Before adding a component:

1. Search for an existing component.
2. Reuse tokens.
3. Check responsive behavior.
4. Check loading/empty/error states.
5. Check accessibility.
6. Check motion requirements.
7. Add analytics events when user behavior is relevant.

Do not introduce arbitrary styling values when a token exists.

## Design Review Checklist

Ask:

- Does this look like CNS Beauty rather than generic ecommerce?
- Is hierarchy clear?
- Is whitespace sufficient?
- Is typography elegant and readable?
- Is the CTA obvious?
- Is AI contextual rather than intrusive?
- Does mobile work without hover?
- Are states complete?
- Is motion restrained?
- Does reduced motion work?
- Is the experience accessible?
