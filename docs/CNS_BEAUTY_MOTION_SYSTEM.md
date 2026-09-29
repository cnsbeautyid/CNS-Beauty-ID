# CNS Beauty Motion System

Status: v0.1 (Phase 1). Referenced by `CLAUDE.md` §7 and the `cns-beauty-design` skill.

## Principles

Motion exists to **explain**, not to decorate:

1. **Hierarchy:** new layers (drawer, sheet, AI panel) arrive from where they live.
2. **Feedback:** hover, press, loading and state changes confirm that an action registered.
3. **Calm:** short distances (≤ 16px or the element's own edge), gentle easing, no bounce.
4. **Never blocking:** content is usable during and without animation.
5. **Reduced motion:** `prefers-reduced-motion: reduce` removes movement globally (`globals.css`).

## Tokens

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 150ms | Input borders, small color changes |
| `--duration-base` | 200ms | Buttons, links, icon buttons |
| `--duration-slow` | 250ms | Dialog, drawer, sheet, AI panel enter/exit |
| `--duration-section` | 400ms | Image hover zoom, section reveals |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default for everything |
| `ease-emphasized` | `cubic-bezier(0.3, 0, 0, 1)` | Larger entrances (Phase 2 hero) |

Use as `duration-(--duration-base) ease-standard`. Don't introduce new durations or curves.

## Patterns

| Element | Motion |
|---|---|
| Button / link hover | Color only, `--duration-base` |
| Product card (desktop hover only) | Image `scale-103`, `--duration-section`. Never required to use the card |
| Modal | Fade plus 8px rise, with the backdrop fading in |
| Drawer (left/right) | Slide from its own edge |
| Bottom sheet | Slide up from the bottom |
| AI panel | Fade plus 16px rise (floating on desktop, full screen on mobile) |
| Loading | Spinner rotation, skeleton pulse. Both stop under reduced motion |

## Implementation

- **Overlays** use native `<dialog>` and CSS transitions with `@starting-style`
  and `transition-behavior: allow-discrete` (`.cns-dialog`, `.cns-ai-panel` in
  `globals.css`). This keeps them in the browser's top layer with native focus
  handling, which JS animation libraries don't manage well.
- **Motion for React (`motion`)** is added in Phase 2 for choreographed work:
  hero entrance, scroll-linked section reveals, AI streaming and recommendation
  cards. Each use must honor `useReducedMotion()`.
- Animate only `opacity` and `transform`. Never animate layout properties
  (width/height/top) on scroll.

## Not allowed

- Parallax on body content, auto-playing carousels, looping ornamental animation.
- Motion that implies AI "thinking" by revealing internal reasoning (CLAUDE.md §7).
- Entrance animation that delays access to prices or the Add to Cart action.
