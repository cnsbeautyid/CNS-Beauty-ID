# Phase 21 Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three WCAG 2.2 AA failures (the skip link doesn't move focus, focus is hidden under the sticky header, sideways scroll at 320px) and add permanent E2E guards, including an axe sweep of every public page.

**Architecture:**
- A client `SkipLink` in the root layout moves focus to `#main-content`.
- `scroll-padding-top`/`-bottom` tokens keep focus clear of the sticky header and the mobile Add-to-Cart bar.
- Shared buttons may wrap, with minimum heights instead of fixed ones.
- One new Playwright spec guards all of it.

**Tech Stack:** Next.js 16, Tailwind v4 tokens in `globals.css`, Playwright with `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-01-accessibility-design.md`

## Global Constraints

- WCAG 2.2 AA; axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.
- No global `overflow-x: hidden`. Fix overflow at its source.
- Single-line buttons keep today's height.
- Design tokens only. The new tokens live in `globals.css`.
- No new dependencies.
- E2E runs against a fresh production build, started with `ENABLE_DESIGN_PREVIEW=true npm run start -- --port 3100`. Stop any listener on 3100 before each rebuild.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The skip link moves focus without scrolling the target under the header,** and still works without JS. Pinned by guard 2 in Task 1.
2. **Wrapped buttons keep the 44px touch target, and single-line buttons don't change height.** Checked by axe `target-size` and the screenshots in Task 4.
3. **A page that still overflows after the button change.** Pinned by the reflow guard on every public page.
4. **The bottom offset only applies where the sticky commerce bar exists** (mobile product pages).
5. **Guards that pass vacuously.** Each guard asserts that it found its target.

---

### Task 1: Guards first (RED)

**Files:**
- Create: `tests/e2e/a11y.spec.ts`

- [ ] **Step 1: Write the spec.** Create `tests/e2e/a11y.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Phase 21 accessibility guards: an axe sweep of every public page, plus the
// behaviours axe can't see (skip-link focus, focus not obscured by the sticky
// header, reflow at 320px).
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PUBLIC_PAGES = [
  "/", "/produk", "CATEGORY", "PRODUCT", "/tentang-kami", "/manfaat", "/testimoni", "/beauty-concierge",
  "/skin-quiz", "/faq", "/kontak", "/kebijakan-privasi", "/reseller", "/cart", "/checkout", "/masuk", "/daftar",
];

async function resolvePath(page: Page, path: string): Promise<string> {
  if (path !== "CATEGORY" && path !== "PRODUCT") return path;
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const pattern = path === "CATEGORY" ? /<loc>https?:\/\/[^<]+(\/produk\/kategori\/[a-z0-9-]+)<\/loc>/ : /<loc>https?:\/\/[^<]+(\/produk\/(?!kategori)[a-z0-9-]+)<\/loc>/;
  const found = sitemap.match(pattern)?.[1];
  expect(found, `${path} in sitemap`).toBeTruthy();
  return found!;
}

async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("Accessibility sweep (WCAG 2.2 AA)", () => {
  test.use({ reducedMotion: "reduce" });

  for (const path of PUBLIC_PAGES) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(await resolvePath(page, path));
      expect(await axeViolations(page)).toEqual([]);
    });
  }

  test("open overlays have no axe violations", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Buka menu" }).click();
    else await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe("Keyboard", () => {
  test("the skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/produk");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Langsung ke konten utama" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
  });

  for (const path of ["PRODUCT", "/produk"]) {
    test(`focus on ${path} is never hidden under the sticky header`, async ({ page }) => {
      await page.goto(await resolvePath(page, path));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.locator("header").first().locator("a:visible, button:visible").last().focus();
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused, "focus moved on").toBeAttached();
      expect(await focused.evaluate((element) => Boolean(element.closest("main"))), "first Tab after the header lands in <main>").toBe(true);
      const header = (await page.locator("header").first().boundingBox())!;
      const top = (await focused.boundingBox())!.y;
      expect(top, "focused element is below the sticky header").toBeGreaterThanOrEqual(header.y + header.height - 1);
    });
  }
});

test.describe("Reflow at 320px (1.4.10)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of PUBLIC_PAGES) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(await resolvePath(page, path));
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
  }
});
```

- [ ] **Step 2: Run it against today's build to confirm it fails.** No source has changed since the last build. Stop any server on 3100, start the server, then run `npx playwright test tests/e2e/a11y.spec.ts`.

Expected:
- the axe sweep passes, as a regression guard;
- the skip-link test fails;
- the focus-not-obscured tests fail;
- reflow fails for `/`, PRODUCT and `/kontak`.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/a11y.spec.ts
git commit -m "test(a11y): axe sweep of public pages, skip-link focus, focus not obscured, reflow at 320px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Skip link and focus offsets

**Files:**
- Create: `src/components/layout/skip-link.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create `src/components/layout/skip-link.tsx`**

```tsx
"use client";

import type { MouseEvent } from "react";

const TARGET_ID = "main-content";

/**
 * "Langsung ke konten utama". Moves focus (not just the scroll position) to
 * <main id="main-content"> so keyboard and screen-reader users continue from
 * the content. Without JavaScript it is still a plain in-page anchor.
 */
export function SkipLink() {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById(TARGET_ID);
    if (!main) return;
    event.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  };

  return (
    <a
      href={`#${TARGET_ID}`}
      onClick={skip}
      className="sr-only rounded-md bg-primary px-4 py-2 text-body-s text-on-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
    >
      Langsung ke konten utama
    </a>
  );
}
```

Keep the existing `<a>`'s `className` if it differs.

- [ ] **Step 2:** In `src/app/layout.tsx`, replace the skip `<a …>Langsung ke konten utama</a>` with `<SkipLink />`, imported from `@/components/layout/skip-link`.

- [ ] **Step 3: Update `src/app/globals.css`:**
  - In the base layer, beside `:focus-visible`, add:

```css
  /* Keep focused/anchored content clear of the sticky header (WCAG 2.4.11). */
  html {
    scroll-padding-top: var(--header-offset);
  }

  /* The skip link focuses <main>; the whole region needs no ring. */
  #main-content:focus {
    outline: none;
  }
```

  - In the `:root` token block (with `--fab-bottom`), add `--header-offset: 4.5rem;`, with the comment `/* Sticky header height (h-16 / desktop:h-20) plus a small gap. */`.
  - In `@media (min-width: 64rem) { :root { … } }`, add `--header-offset: 5.5rem;`.
  - Inside the existing mobile rule `:root:has([data-sticky-commerce]) { … }`, add `scroll-padding-bottom: 6rem;`.

- [ ] **Step 4:** Run `npm run typecheck && npm run lint`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/skip-link.tsx src/app/layout.tsx src/app/globals.css
git commit -m "fix(a11y): skip link moves focus to main; keep focus clear of sticky header and commerce bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Buttons that wrap (reflow)

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Implement.** In `buttonClassName`, change the first class string to:

```ts
    "inline-flex max-w-full items-center justify-center gap-2 rounded-md text-center font-medium tracking-wide",
```

Change `SIZES` to:

```ts
// md/lg meet the 44px touch target; sm is for dense, non-primary contexts.
// Minimum heights (not fixed) so a label that can't fit on a narrow screen
// wraps instead of pushing the layout sideways (WCAG 1.4.10). Single-line
// labels keep exactly these heights.
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 py-1 text-body-s",
  md: "min-h-11 px-6 py-2 text-body-s",
  lg: "min-h-13 px-8 py-2 text-body",
};
```

- [ ] **Step 2:** Run `npm run test && npm run typecheck && npm run lint`. Expected: PASS. If a test asserted the exact class string, update it and record a ruling.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "fix(a11y): buttons wrap instead of forcing sideways scroll at 320px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: GREEN, screenshots, docs

**Files:**
- Modify: `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_CHECKLIST.md`

- [ ] **Step 1:** Stop any server on 3100, `npm run build`, start the server, then run `npx playwright test tests/e2e/a11y.spec.ts`.
Expected: all pass. If reflow still fails on a page, find the innermost element wider than 320px, fix it at its source (`min-w-0` on a grid or flex child, `break-words` on a long word), record a ruling, rebuild and rerun.

- [ ] **Step 2: Screenshots:** 320×640 of `/`, the product page and `/kontak`, plus a desktop product page. Read them. Wrapped buttons should look intentional, and desktop buttons should be unchanged.

- [ ] **Step 3:** Stop the server, run `npm run validate`, restart the server, then run `npx playwright test`.
Expected: 0 failed. If an existing spec depended on a button's exact height or single-line text, fix the spec or record a ruling.

- [ ] **Step 4: Update the docs.**
  - **`ARCHITECTURE.md` header:** `(Phase 21)`, "Phase 21 Accessibility, done and validated", next "Phase 22 E2E testing".
  - **"Phase 21 summary"** above "Phase 20 summary":
    - the baseline: 0 axe violations across 36 states;
    - the three findings and their fixes;
    - the guards spec;
    - still open: signed-in pages (need a test account), manual screen-reader passes, a conformance statement.
  - **Validation row 21.**
  - **Checklist:** `- [x] Accessibility (Phase 21: WCAG 2.2 AA fixes — skip link, focus not obscured, reflow; axe sweep + keyboard/reflow guards)`.
- [ ] **Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md docs/IMPLEMENTATION_CHECKLIST.md
git commit -m "docs: Phase 21 accessibility summary and validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
