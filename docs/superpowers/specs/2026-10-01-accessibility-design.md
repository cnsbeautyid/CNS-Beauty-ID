# Phase 21: Accessibility — Design

- **Date:** 2026-10-01
- **Status:** approved in brainstorming, awaiting spec review
- **Scope source:** master prompt §21 (WCAG 2.2 AA) and the §26 phase list; CLAUDE.md §10
- **Branch:** `feat/phase-21-accessibility` (stacked on `feat/phase-20-performance`)

## 1. Goal

Fix the WCAG 2.2 AA failures that manual and scripted checks found on the public storefront, and add permanent E2E guards so they, and any new axe violations, can't come back unnoticed.

**Owner decision (2026-10-01):** "Fix the 3 + permanent guards".
**Out of scope:**
- pages behind sign-in (account, checkout, reseller portal), because no test account exists;
- manual screen-reader passes;
- a published conformance statement.

## 2. Baseline (local production build, 2026-10-01)

**Automated (axe-core, tags `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`/`wcag22aa`, whole page including the header and footer): 0 violations** across 36 states:
- 18 public pages: `/`, `/produk`, a category page, a product page, `/tentang-kami`, `/manfaat`, `/testimoni`, `/beauty-concierge`, `/skin-quiz`, `/faq`, `/kontak`, `/kebijakan-privasi`, `/reseller`, `/cart`, `/checkout`, `/masuk`, `/daftar`, and a 404;
- each on desktop (1440×900) and mobile (Pixel 7);
- plus the AI panel open (desktop) and the mobile menu open (mobile).

**Scripted keyboard, reflow and form checks found three AA failures:**

| # | Criterion | Finding |
|---|---|---|
| F1 | 2.4.1 Bypass Blocks (robustness) | The skip link "Langsung ke konten utama" is visible on focus, but activating it leaves focus on `<body>`: `<main id="main-content">` isn't focusable. |
| F2 | 2.4.11 Focus Not Obscured (Minimum) | Tabbing on a product page scrolls the breadcrumb under the sticky header (`h-16`, `desktop:h-20`), on desktop and mobile. On mobile product pages, the sticky Add-to-Cart bar can hide focused elements at the bottom in the same way. |
| F3 | 1.4.10 Reflow | At 320px wide, `/`, the product page and `/kontak` scroll sideways by 13–15px. Cause: `buttonClassName` uses `whitespace-nowrap` with fixed heights, so long labels can't wrap and force their column wider. |

**Checked and fine:**
- Sign-in validation: `aria-invalid`, `aria-describedby` to the message, and focus moves to the first invalid field.
- Product-card focus: the ring is drawn on the card's `::after` overlay.
- The global `prefers-reduced-motion` rules.
- Axe's `target-size` rule.

## 3. Changes

### 3.1 Skip link (F1)

- A new client component, `src/components/layout/skip-link.tsx`, replaces the `<a href="#main-content">` in `src/app/layout.tsx`. It keeps the same classes and text.
- **On activation:**
  1. find `#main-content`;
  2. give it `tabindex="-1"` if it has none;
  3. focus it with `preventScroll`;
  4. `scrollIntoView()`, which respects `scroll-padding-top`.
- **Without JavaScript,** it's still a normal anchor link.
- **One component covers every page.**
- **`globals.css`:** `#main-content:focus { outline: none; }`.

### 3.2 Focus not obscured (F2)

- **`globals.css` tokens:**
  - `--header-offset: 4.5rem`, or `5.5rem` at `min-width: 64rem`: the header height plus a 0.5rem gap;
  - `--commerce-bar-offset: 6rem` below 64rem when `[data-sticky-commerce]` is present.
- **`html { scroll-padding-top: var(--header-offset); }`,** and on mobile product pages `scroll-padding-bottom: var(--commerce-bar-offset)`.

### 3.3 Reflow (F3)

`buttonClassName`:
- **Remove `whitespace-nowrap`; add `text-center` and `max-w-full`.**
- **Heights become minimums with padding:** sm `min-h-9 px-4 py-1`, md `min-h-11 px-6 py-2`, lg `min-h-13 px-8 py-2`. Padded single-line text stays below each minimum (29 < 36, 37 < 44, 42 < 52), so single-line buttons keep today's height.
- **No global `overflow-x: hidden`.**
- **If a page still overflows at 320px,** the overflowing element is fixed at its source (for example `min-w-0` on a grid or flex child) and recorded.

## 4. Guards: `tests/e2e/a11y.spec.ts` (desktop and mobile projects)

1. **Axe sweep.** Every public page in §2, whole page, WCAG 2.2 AA tags, reduced motion. The AI panel open (desktop) and the mobile menu open (mobile) are included. Expect no violations.
2. **Skip link.** On `/produk`: Tab, then Enter, leaves `main#main-content` focused.
3. **Focus not obscured.** On the product page and `/produk`: scroll to the bottom, focus the last header link, then press Tab. The focused element's top must be at or below the header's bottom.
4. **Reflow.** At 320×640, every public page has `scrollWidth <= 320`.

Guards 2–4 must fail on today's build. The axe sweep already passes and is a regression guard.

## 5. Validation

- `npm run validate` and the full Playwright suite on a fresh production build.
- **Screenshots** at 320px of `/`, the product page and `/kontak`, plus a desktop product page.
- The Phase 21 summary and a validation row in `docs/ARCHITECTURE.md`; the checklist entry.

## 6. Risks

- **Button wrapping in tight rows elsewhere.** It only affects narrow widths, where wrapping is correct. The screenshots check this.
- **`scroll-padding-top` also offsets in-page anchor jumps.** That's intended.
- **The obscured-focus guard depends on the first in-content focusable element,** which is still a meaningful check if the layout changes.
