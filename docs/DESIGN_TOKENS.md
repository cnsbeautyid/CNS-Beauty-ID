# CNS Beauty — Design Tokens (implementation)

Source: `src/app/globals.css`. Tailwind's default palette, fonts, radii,
shadows and breakpoints are **reset**, so only the classes below exist.

## Colors

Core semantic tokens (from `CLAUDE.md`) carry the UI. The `brand-*` accents
(from `DESIGN_SYSTEM.md`) add the warm blush/cream editorial atmosphere and are
**provisional** until reconciled with the official CNS brand identity.

| Token | Class example | Use |
|---|---|---|
| primary / on-primary | `bg-primary text-on-primary` | Primary buttons, focus ring |
| secondary, surface, background | `bg-surface` | Page and section backgrounds |
| text-primary / text-secondary | `text-text-secondary` | Body copy |
| text-muted | `text-text-muted` | Placeholders, decorative meta only |
| border | `border-border` | Dividers, inputs, cards |
| success / warning / error | `text-error` | Status. Always pair with an icon or text |
| ai-surface / ai-accent | `bg-ai-surface` | AI Concierge surfaces |
| brand-cocoa, brand-cocoa-dark | `text-brand-cocoa-dark` | Editorial headlines, emphasis |
| brand-blush, blush-soft, peach, cream, ivory, beige | `bg-brand-cream` | Section backgrounds, decoration |
| brand-gold, brand-rose-gold | `border-brand-gold` | Hairlines, icons, ornaments |
| overlay | `bg-overlay` | Scrim behind modals and drawers (used by `.cns-dialog::backdrop`) |

### Contrast (WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and UI)

Measured ratios:

| Foreground | on white | on surface | on cream | on blush-soft | on ai-surface |
|---|---|---|---|---|---|
| primary | 16.5 | 15.7 | 15.8 | 12.7 | 14.5 |
| text-secondary | 5.6 | 5.3 | 5.3 | **4.3** | 4.9 |
| text-muted | **2.9** | **2.7** | **2.8** | **2.2** | **2.5** |
| success | 6.1 | 5.8 | 5.9 | 4.7 | 5.4 |
| warning | **3.9** | **3.7** | **3.7** | **3.0** | **3.4** |
| error | 5.1 | 4.9 | 4.9 | **3.9** | 4.5 |
| ai-accent | **4.1** | **3.9** | **4.0** | **3.2** | **3.6** |
| brand-cocoa | 9.9 | 9.4 | 9.5 | 7.6 | 8.7 |
| brand-cocoa-dark | 14.2 | 13.5 | 13.6 | 10.9 | 12.5 |
| brand-blush | **2.6** | | | | |
| brand-rose-gold | **3.2** | | | | |
| brand-gold | **2.6** | | | | |

Rules that follow:

- **Body text:** use only primary, text-secondary, success, error, brand-cocoa
  or brand-cocoa-dark. On `blush-soft`, use primary or cocoa only.
- **warning / ai-accent:** icons, borders, and text of 24px+ (or 18.66px+ bold).
  For warning copy, put the text in `text-primary` next to a warning icon.
- **text-muted, brand-blush, brand-gold:** never for text that must be read.
  Decoration only.
- **brand-rose-gold:** large display text or decoration only.

## Typography

- `font-display` Cormorant Garamond (h1–h4 by default), `font-body` Inter.
- Sizes: `text-display-xl`, `text-display-l`, `text-h1`–`text-h4`, `text-body-l`,
  `text-body`, `text-body-s`, `text-caption`. Display and heading sizes scale
  fluidly from the mobile spec value to the desktop spec value.
- `tracking-eyebrow` for uppercase labels.

## Spacing, radius, shadow

- Spacing is Tailwind's 4px unit (`p-4` = 16px). `py-section` gives 64 / 96 / 128px
  section rhythm.
- Radius: `rounded-sm` 6, `rounded-md` 10 (buttons), `rounded-lg` 16 (product
  cards), `rounded-xl` 24, `rounded-pill`.
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg` (overlays only). Prefer borders.

## Breakpoints

Mobile-first. `tablet:` 640px, `desktop:` 1024px, `wide:` 1440px.
Product grid: `grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 wide:grid-cols-5`.

## Using components

- Preview every primitive at `/design-system` (dev server, or production with
  `ENABLE_DESIGN_PREVIEW=true`).
- `className` on a component is for **layout around it** (margins, grid
  placement), never for changing its display, colors or size. `cn()` doesn't
  resolve conflicts. Use the component's `variant`/`size`/`tone`/`align` props,
  or wrap it in an element (e.g. `<div className="hidden desktop:flex">`).
- Layout/motion for overlays lives in `globals.css` (`.cns-dialog`,
  `.cns-ai-panel`). Everything else uses utilities.

## Motion

Durations `--duration-fast` 150ms, `--duration-base` 200ms, `--duration-slow`
250ms, `--duration-section` 400ms (use as `duration-(--duration-base)`).
Easing: `ease-standard`, `ease-emphasized`. `prefers-reduced-motion` is honored
globally. Full rules: `docs/CNS_BEAUTY_MOTION_SYSTEM.md`.
