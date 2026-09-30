# Phase 17: Beauty Concierge full page — Design

- **Date:** 2026-09-30
- **Status:** approved in brainstorming, awaiting spec review
- **Scope source:** PRD §40 (P1: "Beauty Concierge full page"), CLAUDE.md §8 and §17
- **Branch:** `feat/phase-17-beauty-concierge` (stacked on Phase 16)

## 1. Goal

`/beauty-concierge` becomes a full-page version of the AI Beauty Concierge. The site nav already links there, and today the link 404s.

The page must:

- run the concierge conversation inline, sharing one conversation with the floating panel;
- keep that conversation across a reload for the life of the browser tab;
- show signed-in customers what the concierge knows about them (skin profile, routine, points), and invite everyone else to take the Skin Quiz or sign in;
- stay SEO-first: server-rendered heading, intro and "how it works" content that don't depend on JavaScript.

### Owner decisions (2026-09-30)

| Question | Decision |
|---|---|
| Page purpose | Full-page chat (not a landing page that opens the panel, not a guided consultation flow) |
| History | Survive reload via `sessionStorage`; no past-conversations list |
| Side rail | Personal context: skin profile, routine and points for signed-in customers; Skin Quiz and sign-in CTA otherwise |
| Implementation approach | Extract one shared conversation component used by both panel and page |

### Out of scope

- A list of past conversations (would need a new RLS-scoped read API on `ai_conversations` / `ai_messages`).
- A persistent "recommended products" shelf.
- A guided multi-step consultation flow (overlaps the Skin Quiz).
- `sitemap.ts` / `robots.ts` (the repo has neither; a separate SEO pass).
- Any change to the concierge loop, tools, prompt rules or rate limit, except the one page-type addition in §4.

## 2. Page and layout

**Route:** `src/app/(storefront)/beauty-concierge/page.tsx`, a Server Component.

### Server-rendered content (indexable, no JS required)

- `<h1>` "Beauty Concierge" and a short intro: what the AI helps with, and that it gives care advice, not medical diagnosis.
- `metadata`: title, description, canonical `/beauty-concierge`, Open Graph.
- A three-point "Cara kerja" section below the chat, with its own `<h2>`.

### Side rail

A Server Component, `ConciergeRail`, in `src/features/beauty-concierge/`. It reads through RLS with existing services only:

- `getOwnBeautyProfile` (`src/services/quiz/quiz.ts`)
- `getOwnRoutine` (`src/services/routine/routine.ts`)
- `getLoyaltySummary` (`src/services/account/account.ts`)

Identity comes from the session. The rail takes no user id from the request.

| Viewer | Rail shows |
|---|---|
| Signed in, has a skin profile | Skin type and concerns; AM/PM routine step counts with a link to `/account/routine` (or a "Buat routine" link when there's no routine); points balance and tier; personal prompt chips ("Konsultasikan routine saya", "Produk untuk concern saya") |
| Signed in, no skin profile | Skin Quiz CTA (`/skin-quiz`); general prompt chips |
| Signed out | Skin Quiz CTA; sign-in link to `/masuk?next=/beauty-concierge`; one line saying that signing in lets the AI use your skin profile |
| Any read fails | Falls back to the signed-out view; the chat is unaffected |

The rail only displays data. It sends nothing to the AI: the existing tools (`get_my_profile_and_routine`, `get_my_loyalty`) already read this data server-side when the model needs it.

The rail streams in behind `<Suspense>`, with a skeleton the same size as the rail, so the chat never waits on the database.

### Layout

- **Desktop (≥1024px):** a two-column grid.
  - The chat takes about two-thirds, in a card with the AI surface color (`bg-ai-surface`) and height `calc(100dvh - header)`. Its log scrolls inside the card.
  - The rail takes about one-third and is sticky.
- **Mobile and tablet (<1024px):**
  - The rail collapses into a `<details>` whose summary is one line (for example "Profil kulitmu · 2 concern", or "Kenali kulitmu" when signed out).
  - The chat sits below at full width, with the composer pinned to the bottom of the chat card.
- Design tokens only (CLAUDE.md §6). No new colors, radii or shadows.

### Launcher and panel on this route

- The storefront layout keeps mounting `AILauncher` and `AIPanel`.
- On `/beauty-concierge`, `AILauncher` renders nothing, and an open panel closes when the page mounts.
- The conversation continues inline because both surfaces use the same store.

## 3. Shared conversation component

### `ConciergeConversation` (new)

`src/components/ai/concierge-conversation.tsx`, a client component. It holds everything in today's `AIPanel` below the header:

- the "Kamu sedang melihat …" product-context banner;
- the `role="log"` region with `aria-live="polite"`, `aria-relevant="additions text"` and `aria-busy={pending}`;
- the greeting, messages, thinking/tool-status indicator, product cards, and the WhatsApp or contact handoff;
- the quick prompts, shown only before the first message;
- the `sr-only` status line, input, Stop button and disclaimer;
- auto-scroll of the log while a reply streams.

It takes three props:

```ts
type ConciergeConversationProps = {
  /** Spacing and product-card density only; behavior is identical. */
  variant: "panel" | "page";
  /** Called when a card or link navigates away (the panel closes itself). */
  onNavigate?: () => void;
  /** Defaults to AI_QUICK_ACTIONS. */
  quickActions?: readonly AIQuickAction[];
};
```

With `variant="page"`, product cards sit in two columns at tablet width and wider.

### `AIPanel` (changed)

It keeps the `<dialog>`, its header (title, New conversation, Close), `show`/`showModal` by breakpoint, Escape handling, focus return and the `AI_OPENED` event. It renders `<ConciergeConversation variant="panel" onNavigate={close} />`.

The panel's behavior and markup must not change. The existing panel E2E tests are the regression gate.

### Page wiring

- **`ConciergeChat`** (client, `src/features/beauty-concierge/`) renders the chat card: an `<h2>` row with the New conversation button, then `<ConciergeConversation variant="page" />`.
- **`ConciergePageContext`** (client, renders nothing) runs once on mount:
  - `setPageContext({ pageType: "concierge" })`, cleared again on unmount (following `src/features/product-detail/ai-context-setter.tsx`);
  - `closeAIPanel()`;
  - `track("AI_OPENED", { source: "page" })`, which the v1 contract already allows (`src/services/analytics/model.ts`).
- **Rail prompt chips** (client) call the existing `useUIStore.setAIDraft(prompt)`, then move focus to the chat input. The customer still presses Send, the same as the panel's chips.

## 4. Page type

- `PAGE_TYPES` in `src/services/ai/protocol.ts` and `AIPageContext["pageType"]` in `src/types/ai.ts` gain `"concierge"`.
- `pageTypeFromPath("/beauty-concierge")` returns `"concierge"`.
- The page-context line in `src/services/ai/prompt.ts` describes it: the customer opened the dedicated concierge page, with no specific product in view.
- It stays a hint, never authorization (CLAUDE.md §8).

## 5. Conversation persistence

Zustand's `persist` middleware (part of `zustand`, no new dependency) on `useAIStore`:

- **Storage:** `sessionStorage`, key `cns-ai-conversation`, `version: 1`, through a `createJSONStorage` wrapper whose `getItem`/`setItem`/`removeItem` catch errors. Blocked storage behaves the way the store does today.
- **`partialize`:** `conversationId` and the last 20 messages (the API's `MAX_HISTORY` window), each with `content`, `products`, `handoffUrl` and `state`. `pending`, `statusLabel` and `pageContext` are not stored.
- **Mid-stream reload:** a message saved with `state: "streaming"` is restored as `state: "error"`, with content `"Jawaban dihentikan."` when it is empty. `send()` never sends it back as context.
- **Hydration:** `skipHydration: true`, and one `useAIStore.persist.rehydrate()` in a client effect inside `AIPanel`, which is mounted on every storefront page. The server HTML and the first client render then match (greeting only).
- **Reset:** `reset()` clears the in-memory state, and `persist` writes the empty state.
- **Sign-out:** the sign-out button calls `reset()` and removes the key before `signOutAction` submits, so the next person on a shared browser can't see the previous customer's conversation.
- **Server trust:** a restored `conversationId` goes back as today. `src/services/ai/conversation.ts` reuses it only when it belongs to the caller, so a stale or foreign id starts a new conversation.

## 6. UI states

| State | Chat | Rail |
|---|---|---|
| Loading | Server HTML shows the greeting and quick prompts; the stored conversation fills in after hydration; while streaming, the existing indicator shows | `<Suspense>` skeleton the same size as the rail |
| Empty | Greeting and quick prompts | Signed-out or no-profile view |
| Error | Existing network, 429 and "sedang tidak tersedia" messages, each with a WhatsApp or contact link | Signed-out view |
| Success | Streamed reply, product cards, handoff | Profile, routine and points summary |

## 7. Accessibility (WCAG 2.2 AA)

- **Headings:** one `<h1>`, then an `<h2>` each for the chat, the rail and "Cara kerja".
- **Landmarks:** the chat is a `<section aria-labelledby>`; the rail is an `<aside aria-label="Profil kecantikanmu">`.
- **Screen readers:** the live-region strategy is reused unchanged, because it lives in `ConciergeConversation`.
- **Focus:**
  - The page does not move focus to the input on load, which would hijack screen readers and open the mobile keyboard.
  - Focus moves to the input only after a rail chip is chosen.
- **Keyboard:** everything is reachable in DOM order (heading, rail, chat, input). `<details>` works with the keyboard natively.
- **Touch targets:** chips are at least 44px tall on mobile.
- **Reduced motion:** no new animation. The existing indicator already respects reduced motion.
- **Hover:** nothing essential depends on hover (CLAUDE.md §11).

## 8. Analytics

- `AI_OPENED { source: "page" }` fires once when the page mounts.
- `AI_MESSAGE_SENT` and `AI_RECOMMENDATION_ACCEPTED` are unchanged: they fire from shared code, so both surfaces report them.
- `PAGE_VIEWED` comes from the existing automatic tracking.
- No new event names or properties, so the event contract stays at v1.

## 9. Testing and validation

### Unit tests (Vitest)

In `tests/unit/ai-store-persist.test.ts` (new):

- `partialize` keeps `conversationId` and at most 20 messages, and drops `pending`, `statusLabel` and `pageContext`;
- a stored `streaming` message is restored as stopped (`error`) and is left out of the `send()` history;
- storage that throws on `getItem`/`setItem` is swallowed;
- `reset()` leaves an empty stored state.

In `tests/unit/ai.test.ts` (extended):

- the chat request schema accepts `pageType: "concierge"`;
- `pageTypeFromPath("/beauty-concierge")` returns `"concierge"`.

### E2E tests (Playwright)

In `tests/e2e/ai-concierge.spec.ts`, using the existing mocked SSE stream:

1. With JavaScript disabled, `/beauty-concierge` renders the h1, intro and "Cara kerja".
2. A quick prompt streams a reply inline, with a product card.
3. The conversation is still there after a reload.
4. A conversation started in the panel on `/` continues on `/beauty-concierge`, and the launcher is hidden there.
5. Signed out, a rail chip pre-fills the input and focuses it.
6. Mobile (390px): the rail `<details>` is collapsed and there is no horizontal scroll. Desktop (1280px): two columns.
7. The existing panel specs pass unchanged.

The signed-in rail can't be tested end to end, because the suite never signs in to live Auth (see the Phase 15 notes and Phase 20). Instead, the rail's decisions live in a pure function, `buildRailModel(profile, routine, loyalty)` in `src/features/beauty-concierge/rail-model.ts`, which returns the view kind (`personal` / `no-profile` / `signed-out`), the mobile summary line and the prompt chips. Its unit tests (`tests/unit/concierge-rail-model.test.ts`) cover all three views and the fallback when a read fails. The repo has no React Testing Library or jsdom, and this phase doesn't add them.

### Validation

`typecheck`, `lint`, `test`, `build`, and Playwright E2E against the local server. Results are recorded in `docs/ARCHITECTURE.md` under "Phase 17 summary", and `docs/IMPLEMENTATION_CHECKLIST.md` gets "Beauty Concierge" checked.

## 10. Files

| File | Change |
|---|---|
| `src/app/(storefront)/beauty-concierge/page.tsx` | new: Server Component page and metadata |
| `src/features/beauty-concierge/concierge-rail.tsx` | new: server rail (data reads + view) |
| `src/features/beauty-concierge/rail-model.ts` | new: pure `buildRailModel` (view kind, summary line, chips) |
| `src/features/beauty-concierge/concierge-chat.tsx` | new: client chat card |
| `src/features/beauty-concierge/concierge-page-context.tsx` | new: client context, panel close, `AI_OPENED` |
| `src/features/beauty-concierge/rail-prompt-chips.tsx` | new: client chips |
| `src/components/ai/concierge-conversation.tsx` | new: shared conversation body |
| `src/components/ai/ai-panel.tsx` | changed: renders the shared body, rehydrates the store |
| `src/components/ai/ai-launcher.tsx` | changed: hidden on `/beauty-concierge` |
| `src/stores/ai-store.ts` | changed: `persist` with `sessionStorage` |
| `src/features/auth/sign-out-button.tsx` | changed: clears the stored conversation |
| `src/services/ai/protocol.ts`, `src/types/ai.ts`, `src/features/ai/chat-client.ts`, `src/services/ai/prompt.ts` | changed: `"concierge"` page type |
| `tests/unit/ai-store-persist.test.ts`, `tests/unit/concierge-rail-model.test.ts` | new |
| `tests/unit/ai.test.ts`, `tests/e2e/ai-concierge.spec.ts` | extended |
| `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_CHECKLIST.md` | Phase 17 summary, checklist |

## 11. Risks

- **The panel extraction regresses the panel.** Mitigation: markup moves as is, and the existing panel E2E tests are the gate.
- **Hydration mismatch from persisted state.** Mitigation: `skipHydration` plus rehydrating after mount.
- **Conversation text in `sessionStorage`.** It is scoped to the tab and cleared on sign-out, and it's the same text the customer can already see on screen. It holds no secrets or tokens.
- **Rail DB reads add latency.** Mitigation: `<Suspense>` streaming, so the chat renders first.
