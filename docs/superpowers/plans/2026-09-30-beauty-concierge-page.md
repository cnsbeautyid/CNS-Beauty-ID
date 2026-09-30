# Beauty Concierge Full Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/beauty-concierge`: a full-page AI Beauty Concierge that shares one conversation (kept across a reload) with the floating panel, next to a personal side rail.

**Architecture:**
- The panel's conversation body moves into one shared client component, `ConciergeConversation`. `AIPanel` and the new page both render it on top of the existing `useAIStore`.
- The store gains Zustand `persist` backed by `sessionStorage`. Writes wait for rehydration, and restored data is validated with Zod.
- The page is a Server Component. It has SEO content and a side rail that is also a Server Component, reads through RLS with the existing services, and streams in behind `<Suspense>`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Zustand 5 (`zustand/middleware` `persist`), Zod 4, Tailwind v4 tokens, Vitest (node environment), Playwright + `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-09-30-beauty-concierge-page-design.md`

## Global Constraints

- No new dependencies. `persist` ships with `zustand`. There is no React Testing Library and no jsdom; unit tests run in Vitest's node environment.
- CNS design tokens only (CLAUDE.md §6). The only new token is `--ai-page-chat-height: min(48rem, calc(100dvh - 8rem))` in `src/app/globals.css`.
- Storage key `cns-ai-conversation`, `sessionStorage`, persist `version: 1`, at most `MAX_HISTORY` (20) stored messages.
- Page context is a hint, never authorization (CLAUDE.md §8). The new page type is exactly `"concierge"`.
- UI copy is Indonesian and follows the existing tone. The copy strings in this plan are final.
- `AI_OPENED` for the page uses the existing v1 property `{ source: "page" }`. No new event names.
- The panel must behave exactly as before. Every existing test in `tests/e2e/ai-concierge.spec.ts` passes unchanged.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Early writes before rehydration.** A `set()` before `rehydrate()` (the page's `setPageContext` runs first) must not overwrite the saved conversation. Pinned in Task 2 (`does not overwrite the saved conversation before rehydrating`).
2. **Corrupt or tampered stored JSON.** Examples: a `javascript:` handoff URL, a non-UUID id, the wrong shape, invalid JSON. These must be discarded, leaving an empty conversation and no crash. Pinned in Task 2 (`restorePersisted` rejection cases, and `starts empty when the stored value is corrupt`).
3. **Blocked storage.** In a private window, or when `sessionStorage` throws, chat must still work, just without persistence. Pinned in Task 2 (gated storage cases).
4. **Signed in, but a read fails.** When the profile read fails, the customer must see the no-profile view, never a "Masuk" link. When only the routine or points read fails, only that row is hidden. Pinned in Task 4 (`buildRailModel` cases).
5. **The page steals focus on load.** On mobile this opens the keyboard. The input must not be focused until a rail chip is chosen. Pinned in Task 5 (E2E `does not focus the input on load`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/services/ai/protocol.ts` | add `"concierge"` to `PAGE_TYPES`; export `productCardSchema` |
| `src/types/ai.ts` | add `"concierge"` to `AIPageContext["pageType"]` |
| `src/features/ai/chat-client.ts` | `pageTypeFromPath` maps `/beauty-concierge` |
| `src/services/ai/prompt.ts` | page-context note for the concierge page |
| `src/stores/ai-persistence.ts` (new) | pure persistence helpers: gated storage, `toPersisted`, `restorePersisted` |
| `src/stores/ai-store.ts` | wraps the store in `persist`; exports `clearStoredConversation` |
| `src/components/ai/ai-input.tsx` | optional `id` and `autoFocus` props |
| `src/components/ai/ai-product-card.tsx` | optional `layout: "scroll" \| "grid"` |
| `src/components/ai/concierge-conversation.tsx` (new) | shared conversation body |
| `src/components/ai/ai-panel.tsx` | dialog shell rendering `ConciergeConversation`; rehydrates the store |
| `src/components/ai/ai-launcher.tsx` | renders nothing on `/beauty-concierge` |
| `src/config/ai.ts` | `CONCIERGE_PAGE_INPUT_ID`, rail prompt definitions |
| `src/features/beauty-concierge/rail-model.ts` (new) | pure `buildRailModel` |
| `src/features/beauty-concierge/concierge-rail.tsx` (new) | server rail: data reads, view, skeleton |
| `src/features/beauty-concierge/rail-prompt-chips.tsx` (new) | client chips: pre-fill and focus |
| `src/features/beauty-concierge/concierge-chat.tsx` (new) | client chat card |
| `src/features/beauty-concierge/concierge-page-context.tsx` (new) | client: page context, close panel, `AI_OPENED` |
| `src/app/(storefront)/beauty-concierge/page.tsx` (new) | the route |
| `src/app/globals.css` | `--ai-page-chat-height` token |
| `src/features/auth/sign-out-form.tsx` (new), `src/features/auth/sign-out-button.tsx` | clear the conversation on sign-out |
| `tests/unit/ai.test.ts`, `tests/unit/ai-store-persist.test.ts` (new), `tests/unit/concierge-rail-model.test.ts` (new), `tests/e2e/ai-concierge.spec.ts` | tests |
| `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_CHECKLIST.md` | Phase 17 summary |

---

### Task 1: `"concierge"` page type

**Files:**
- Modify: `src/services/ai/protocol.ts:32` (export the card schema), `src/services/ai/protocol.ts:80` (`PAGE_TYPES`)
- Modify: `src/types/ai.ts:7`
- Modify: `src/features/ai/chat-client.ts:30-38`
- Modify: `src/services/ai/prompt.ts:53-58`
- Test: `tests/unit/ai.test.ts`

**Interfaces:**
- Produces: `PAGE_TYPES` includes `"concierge"`; `AIPageContext["pageType"]` includes `"concierge"`; `export const productCardSchema` (the former private `cardSchema`, used by Task 2); `pageTypeFromPath("/beauty-concierge") === "concierge"`; `buildContextNote({ pageType: "concierge" })` returns a string containing `"Beauty Concierge"`.

- [ ] **Step 1: Write the failing tests.** Append to `tests/unit/ai.test.ts` (the imports it needs, `pageTypeFromPath`, `buildContextNote` and `chatRequestSchema`, are already at the top of the file):

```ts
describe("concierge page type", () => {
  it("accepts the concierge page type and maps its path", () => {
    const request = { messages: [{ role: "user", content: "Halo" }], pageContext: { pageType: "concierge" } };
    expect(chatRequestSchema.safeParse(request).success).toBe(true);
    expect(pageTypeFromPath("/beauty-concierge")).toBe("concierge");
    expect(pageTypeFromPath("/beauty")).toBe("other");
  });

  it("describes the concierge page as context, not a product", () => {
    const note = buildContextNote({ pageType: "concierge" });
    expect(note).toContain("Beauty Concierge");
    expect(note).not.toContain("slug");
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/ai.test.ts -t "concierge page type"`
Expected: FAIL. The schema rejects `"concierge"`, and `pageTypeFromPath` returns `"other"`.

- [ ] **Step 3: Implement**

In `src/services/ai/protocol.ts`, rename `const cardSchema` to `export const productCardSchema`, and update its one use in `eventSchema` (`z.array(productCardSchema)`). Then:

```ts
export const PAGE_TYPES = ["home", "shop", "product", "cart", "checkout", "account", "reseller", "concierge", "other"] as const;
```

In `src/types/ai.ts`:

```ts
  pageType: "home" | "shop" | "product" | "cart" | "checkout" | "account" | "reseller" | "concierge" | "other";
```

In `src/features/ai/chat-client.ts`, inside `pageTypeFromPath`, add this before `return "other";`:

```ts
  if (pathname === "/beauty-concierge") return "concierge";
```

In `src/services/ai/prompt.ts`, inside `buildContextNote`, add this after the product branch and before the generic `return`:

```ts
  if (context.pageType === "concierge") {
    return "Konteks halaman: pelanggan membuka halaman Beauty Concierge untuk konsultasi. Tidak ada produk tertentu yang sedang dilihat.";
  }
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `npx vitest run tests/unit/ai.test.ts && npm run typecheck`
Expected: PASS. If typecheck flags an exhaustive `switch` or `Record` over the page type elsewhere (for example in analytics), add the `"concierge"` case there with the same meaning as `"other"`.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/protocol.ts src/types/ai.ts src/features/ai/chat-client.ts src/services/ai/prompt.ts tests/unit/ai.test.ts
git commit -m "feat(ai): add concierge page type to the chat context contract

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Conversation persistence

**Files:**
- Create: `src/stores/ai-persistence.ts`
- Modify: `src/stores/ai-store.ts` (wrap in `persist`; add `clearStoredConversation`)
- Test: `tests/unit/ai-store-persist.test.ts`

**Interfaces:**
- Consumes: `productCardSchema`, `MAX_HISTORY` from `@/services/ai/protocol` (Task 1); `ConciergeMessage` type from `@/stores/ai-store` (type-only import).
- Produces:
  - `AI_CONVERSATION_STORAGE_KEY = "cns-ai-conversation"`
  - `STOPPED_REPLY = "Jawaban dihentikan."`
  - `type PersistedConversation = { conversationId: string | null; messages: ConciergeMessage[] }`
  - `toPersisted(state: PersistedConversation): PersistedConversation`
  - `restorePersisted(value: unknown): PersistedConversation | null`
  - `createGatedStorage(getStorage: () => Storage): { storage: StateStorage; open: () => void }`
  - From `ai-store.ts`: `useAIStore.persist.rehydrate()` (used by Task 3), and `clearStoredConversation(): void` (used by Task 6).

- [ ] **Step 1: Write the failing tests.** Create `tests/unit/ai-store-persist.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_CONVERSATION_STORAGE_KEY,
  createGatedStorage,
  restorePersisted,
  STOPPED_REPLY,
  toPersisted,
} from "@/stores/ai-persistence";
import type { ConciergeMessage } from "@/stores/ai-store";

const ID = "3f2b6c1e-8a4d-4c2e-9b7a-1d2e3f4a5b6c";

function message(index: number, overrides: Partial<ConciergeMessage> = {}): ConciergeMessage {
  return { id: `m${index}`, role: index % 2 ? "assistant" : "user", content: `pesan ${index}`, products: [], state: "done", ...overrides };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function stored(storage: Storage) {
  const raw = storage.getItem(AI_CONVERSATION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: { conversationId: string | null; messages: ConciergeMessage[] }; version: number }) : null;
}

describe("toPersisted", () => {
  it("keeps only the conversation id and the last 20 messages", () => {
    const state = { conversationId: ID, messages: Array.from({ length: 25 }, (_, index) => message(index)), pending: true, statusLabel: "Mencari…" };
    const persisted = toPersisted(state);
    expect(Object.keys(persisted).sort()).toEqual(["conversationId", "messages"]);
    expect(persisted.messages).toHaveLength(20);
    expect(persisted.messages[0]?.id).toBe("m5");
  });
});

describe("restorePersisted", () => {
  it("restores a valid conversation", () => {
    const value = { conversationId: ID, messages: [message(0), message(1, { handoffUrl: "https://wa.me/62812" })] };
    expect(restorePersisted(value)).toEqual(value);
  });

  it("turns a reply that was still streaming into a stopped one", () => {
    const restored = restorePersisted({
      conversationId: null,
      messages: [message(0), message(1, { content: "", state: "streaming" }), message(3, { content: "Setengah", state: "streaming" })],
    });
    expect(restored?.messages[1]).toMatchObject({ content: STOPPED_REPLY, state: "error" });
    expect(restored?.messages[2]).toMatchObject({ content: "Setengah", state: "error" });
  });

  it.each([
    ["not an object", "hello"],
    ["missing messages", { conversationId: ID }],
    ["non-uuid conversation id", { conversationId: "../admin", messages: [] }],
    ["unsafe handoff url", { conversationId: null, messages: [message(1, { handoffUrl: "javascript:alert(1)" })] }],
    ["unknown role", { conversationId: null, messages: [{ ...message(0), role: "system" }] }],
    ["too many messages", { conversationId: null, messages: Array.from({ length: 21 }, (_, index) => message(index)) }],
  ])("discards %s", (_label, value) => {
    expect(restorePersisted(value)).toBeNull();
  });
});

describe("createGatedStorage", () => {
  it("ignores writes until opened", () => {
    const backing = memoryStorage();
    const gate = createGatedStorage(() => backing);
    gate.storage.setItem("k", "early");
    expect(backing.getItem("k")).toBeNull();
    gate.open();
    gate.storage.setItem("k", "late");
    expect(backing.getItem("k")).toBe("late");
  });

  it("swallows storage that throws", () => {
    const gate = createGatedStorage(() => {
      throw new Error("blocked");
    });
    gate.open();
    expect(gate.storage.getItem("k")).toBeNull();
    expect(() => gate.storage.setItem("k", "v")).not.toThrow();
    expect(() => gate.storage.removeItem("k")).not.toThrow();
  });
});

describe("useAIStore persistence", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    storage = memoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  it("does not overwrite the saved conversation before rehydrating, then restores it", async () => {
    storage.setItem(
      AI_CONVERSATION_STORAGE_KEY,
      JSON.stringify({ state: { conversationId: ID, messages: [message(0), message(1, { content: "", state: "streaming" })] }, version: 1 }),
    );
    const { useAIStore } = await import("@/stores/ai-store");

    // The page sets its context before AIPanel's rehydrate effect runs.
    useAIStore.getState().setPageContext({ pageType: "concierge" });
    expect(stored(storage)?.state.messages).toHaveLength(2);

    await useAIStore.persist.rehydrate();
    const state = useAIStore.getState();
    expect(state.conversationId).toBe(ID);
    expect(state.pageContext).toEqual({ pageType: "concierge" });
    expect(state.messages.at(-1)).toMatchObject({ content: STOPPED_REPLY, state: "error" });
  });

  it("starts empty when the stored value is corrupt", async () => {
    storage.setItem(AI_CONVERSATION_STORAGE_KEY, "{not json");
    const { useAIStore } = await import("@/stores/ai-store");
    await useAIStore.persist.rehydrate();
    expect(useAIStore.getState().messages).toEqual([]);
  });

  it("reset stores an empty conversation, and clearStoredConversation removes the key", async () => {
    storage.setItem(AI_CONVERSATION_STORAGE_KEY, JSON.stringify({ state: { conversationId: ID, messages: [message(0)] }, version: 1 }));
    const { useAIStore, clearStoredConversation } = await import("@/stores/ai-store");
    await useAIStore.persist.rehydrate();

    useAIStore.getState().reset();
    expect(stored(storage)?.state).toEqual({ conversationId: null, messages: [] });

    clearStoredConversation();
    expect(storage.getItem(AI_CONVERSATION_STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/ai-store-persist.test.ts`
Expected: FAIL with `Failed to resolve import "@/stores/ai-persistence"`.

- [ ] **Step 3: Create `src/stores/ai-persistence.ts`**

```ts
import { z } from "zod";
import type { StateStorage } from "zustand/middleware";

import { MAX_HISTORY, productCardSchema } from "@/services/ai/protocol";

import type { ConciergeMessage } from "./ai-store";

// Keeps the concierge conversation across a reload for the life of the tab
// (sessionStorage). Only what the customer already sees is stored: no tokens,
// no identity, no prices beyond the tool-sourced cards on screen.

export const AI_CONVERSATION_STORAGE_KEY = "cns-ai-conversation";
export const STOPPED_REPLY = "Jawaban dihentikan.";

export type PersistedConversation = { conversationId: string | null; messages: ConciergeMessage[] };

const messageSchema = z.object({
  id: z.string().max(64),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20_000),
  products: z.array(productCardSchema).max(12),
  // Rendered as a link: only https, so a tampered value can't become javascript:.
  handoffUrl: z.string().regex(/^https:\/\//).nullable().optional(),
  state: z.enum(["streaming", "done", "error", "unavailable"]),
});

const persistedSchema = z.object({
  conversationId: z.uuid().nullable(),
  messages: z.array(messageSchema).max(MAX_HISTORY),
});

export function toPersisted(state: PersistedConversation): PersistedConversation {
  return { conversationId: state.conversationId, messages: state.messages.slice(-MAX_HISTORY) };
}

/** Validated stored conversation, or null when it is missing or invalid. */
export function restorePersisted(value: unknown): PersistedConversation | null {
  const parsed = persistedSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    conversationId: parsed.data.conversationId,
    // A reply cut off by the reload is shown as stopped and never sent back as context.
    messages: parsed.data.messages.map((message) =>
      message.state === "streaming" ? { ...message, content: message.content || STOPPED_REPLY, state: "error" } : message,
    ),
  };
}

/**
 * Storage that never throws (private mode, blocked site data) and ignores
 * writes until opened. persist writes on every set(), even before rehydrate(),
 * so without the gate an early set would overwrite the saved conversation.
 */
export function createGatedStorage(getStorage: () => Storage): { storage: StateStorage; open: () => void } {
  let open = false;
  return {
    open: () => {
      open = true;
    },
    storage: {
      getItem: (name) => {
        try {
          return getStorage().getItem(name);
        } catch {
          return null;
        }
      },
      setItem: (name, value) => {
        if (!open) return;
        try {
          getStorage().setItem(name, value);
        } catch {
          // Full or blocked: the conversation just won't survive a reload.
        }
      },
      removeItem: (name) => {
        try {
          getStorage().removeItem(name);
        } catch {
          // Blocked storage has nothing to remove.
        }
      },
    },
  };
}
```

- [ ] **Step 4: Wrap the store in `persist`.** In `src/stores/ai-store.ts`:

Add these imports:

```ts
import { createJSONStorage, persist } from "zustand/middleware";

import { AI_CONVERSATION_STORAGE_KEY, createGatedStorage, restorePersisted, STOPPED_REPLY, toPersisted } from "./ai-persistence";
```

Replace the literal `"Jawaban dihentikan."` in `send()`'s abort branch with `STOPPED_REPLY`.

Add this above the store:

```ts
// Lazy: window is only read when the store touches storage (never during SSR).
const gate = createGatedStorage(() => window.sessionStorage);
```

Replace the `export const useAIStore = create<AIState>()((set, get) => { ... });` wrapper with the version below. The factory body between the braces stays exactly as it is:

```ts
// AI state (CLAUDE.md §5), separate from UI state (ui-store) and server state.
// Persisted per tab so a reload or the /beauty-concierge page keeps the conversation.
export const useAIStore = create<AIState>()(
  persist(
    (set, get) => {
      // ...existing factory body, unchanged...
    },
    {
      name: AI_CONVERSATION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => gate.storage),
      partialize: (state) => toPersisted(state),
      merge: (persisted, current) => ({ ...current, ...(restorePersisted(persisted) ?? {}) }),
      // Rehydrated after mount by AIPanel, so server HTML and the first client render match.
      skipHydration: true,
      // Called when hydration finishes, successfully or not: only then may writes happen.
      onRehydrateStorage: () => () => gate.open(),
    },
  ),
);

/** Forget the conversation on this device (used on sign-out). */
export function clearStoredConversation(): void {
  useAIStore.getState().reset();
  gate.storage.removeItem(AI_CONVERSATION_STORAGE_KEY);
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run tests/unit/ai-store-persist.test.ts && npm run typecheck`
Expected: PASS. If TypeScript can't infer the persisted type, annotate the call as `persist<AIState, [], [], PersistedConversation>(...)`.

- [ ] **Step 6: Commit**

```bash
git add src/stores/ai-persistence.ts src/stores/ai-store.ts tests/unit/ai-store-persist.test.ts
git commit -m "feat(ai): keep the concierge conversation across reloads (sessionStorage)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared `ConciergeConversation`, panel refactor

**Files:**
- Create: `src/components/ai/concierge-conversation.tsx`
- Modify: `src/components/ai/ai-panel.tsx` (whole body below the header)
- Modify: `src/components/ai/ai-input.tsx:8-44`
- Modify: `src/components/ai/ai-product-card.tsx:13-40`
- Test: `tests/e2e/ai-concierge.spec.ts` (the existing panel specs are the regression gate)

**Interfaces:**
- Consumes: `useAIStore`, including `useAIStore.persist.rehydrate()` (Task 2).
- Produces:
  - `ConciergeConversation({ variant, onNavigate?, quickActions?, inputId?, autoFocusInput? })`, where `variant: "panel" | "page"`, `quickActions: readonly AIQuickAction[]` defaults to `AI_QUICK_ACTIONS`, and `autoFocusInput` defaults to `true`.
  - `AIInput` gains `id?: string` and `autoFocus?: boolean` (default `true`).
  - `AIProductCards` gains `layout?: "scroll" | "grid"` (default `"scroll"`).

- [ ] **Step 1: Record the baseline.** Run the panel E2E specs before touching anything.

Run: `npx playwright test tests/e2e/ai-concierge.spec.ts`
Expected: all pass (the mobile or desktop specs that skip themselves count as skipped). If anything already fails, stop and report it; don't change code to hide it.

- [ ] **Step 2: Add `id` and `autoFocus` to `AIInput`.** In `src/components/ai/ai-input.tsx`, extend the props and use them:

```tsx
type AIInputProps = {
  onSubmit: (message: string) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** Fixed id so page elements (rail chips) can focus the input. */
  id?: string;
  /** The panel focuses on open; the full page never steals focus on load. */
  autoFocus?: boolean;
};

export function AIInput({ onSubmit, value: controlledValue, onValueChange, disabled, id: idProp, autoFocus = true }: AIInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
```

On the `<input>`, replace the bare `autoFocus` attribute with `autoFocus={autoFocus}`.

- [ ] **Step 3: Add a grid layout to `AIProductCards`.** In `src/components/ai/ai-product-card.tsx`, add `layout = "scroll"` to the destructured props, with the type `layout?: "scroll" | "grid";`. Then change the list, item and image:

```tsx
    <ul
      aria-label="Rekomendasi produk"
      className={layout === "grid" ? "grid grid-cols-2 gap-3" : "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1"}
    >
      {products.map((product) => (
        <li key={product.slug} className={layout === "grid" ? "min-w-0" : "w-44 shrink-0"}>
```

```tsx
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  sizes={layout === "grid" ? "(min-width: 64rem) 20rem, 45vw" : "176px"}
                  className="object-cover"
                />
              )}
```

- [ ] **Step 4: Create `src/components/ai/concierge-conversation.tsx`.** This is the panel body moved as is, with `variant` only changing spacing, chip height and card layout:

```tsx
"use client";

import { MessageCircle, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY, AI_QUICK_ACTIONS } from "@/config/ai";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";
import type { AIQuickAction } from "@/types/ai";

import { AIInput } from "./ai-input";
import { AIMessage } from "./ai-message";
import { AIProductCards } from "./ai-product-card";
import { AIThinkingIndicator } from "./ai-thinking-indicator";

type ConciergeConversationProps = {
  /** Spacing and product-card density only; behavior is identical. */
  variant: "panel" | "page";
  /** Called when a card or link navigates away (the panel closes itself). */
  onNavigate?: () => void;
  quickActions?: readonly AIQuickAction[];
  inputId?: string;
  autoFocusInput?: boolean;
};

/**
 * The concierge conversation, shared by the floating panel and /beauty-concierge.
 * Replies stream from /api/ai/chat; product cards and the WhatsApp handoff come
 * from tool data, never from model text.
 */
export function ConciergeConversation({
  variant,
  onNavigate,
  quickActions = AI_QUICK_ACTIONS,
  inputId,
  autoFocusInput = true,
}: ConciergeConversationProps) {
  const messages = useAIStore((state) => state.messages);
  const pending = useAIStore((state) => state.pending);
  const statusLabel = useAIStore((state) => state.statusLabel);
  const send = useAIStore((state) => state.send);
  const stop = useAIStore((state) => state.stop);
  const pageContext = useAIStore((state) => state.pageContext);
  const conversationId = useAIStore((state) => state.conversationId);
  // In the store so "ask AI" buttons and rail chips elsewhere can pre-fill a question.
  const draft = useUIStore((state) => state.aiDraft);
  const setDraft = useUIStore((state) => state.setAIDraft);
  const logRef = useRef<HTMLDivElement>(null);
  const page = variant === "page";

  // Keep the newest content in view while a reply streams in.
  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length, lastContent, statusLabel]);

  const hasConversation = messages.length > 0;
  const offeredWhatsApp = messages.some((message) => message.handoffUrl);
  const gutter = page ? "px-4 tablet:px-6" : "px-5";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pageContext?.productName && (
        <p className={cn("border-b border-border bg-ai-surface py-2 text-caption text-text-secondary", gutter)}>
          Kamu sedang melihat <span className="font-medium text-text-primary">{pageContext.productName}</span>
        </p>
      )}

      {/* aria-busy holds announcements until a streamed reply is complete. */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={pending}
        className={cn("flex flex-1 flex-col gap-3 overflow-y-auto py-5", gutter)}
      >
        <AIMessage role="assistant">{AI_COPY.greeting}</AIMessage>
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-2">
            {message.content && (
              <AIMessage role={message.role} notice={message.state === "error" || message.state === "unavailable"}>
                {message.content}
              </AIMessage>
            )}
            {message.state === "streaming" && (!message.content || statusLabel) && <AIThinkingIndicator label={statusLabel} />}
            {message.products.length > 0 && (
              <AIProductCards
                products={message.products}
                conversationId={conversationId}
                onNavigate={onNavigate}
                layout={page ? "grid" : "scroll"}
              />
            )}
            {message.handoffUrl && (
              <a
                href={message.handoffUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-pill border border-primary px-4 py-2 text-body-s font-medium text-text-primary transition-colors duration-(--duration-base) hover:bg-secondary"
              >
                <MessageCircle aria-hidden className="size-4" />
                Chat tim CNS Beauty di WhatsApp
                <span className="sr-only">(membuka WhatsApp)</span>
              </a>
            )}
          </div>
        ))}
        {hasConversation && !offeredWhatsApp && (
          <Link
            href={ROUTES.contact}
            onClick={onNavigate}
            className="inline-flex items-center gap-2 self-start text-body-s font-medium text-brand-cocoa underline underline-offset-4"
          >
            <MessageCircle aria-hidden className="size-4" />
            Hubungi tim CNS Beauty
          </Link>
        )}
      </div>

      <div className={cn("flex flex-col gap-3 border-t border-border pt-4", gutter, page ? "pb-4" : "pb-(--fab-bottom)")}>
        {!hasConversation && (
          <ul aria-label="Pertanyaan cepat" className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => setDraft(action.prompt)}
                  className={cn(
                    "rounded-pill border border-border px-3 text-caption text-text-primary transition-colors duration-(--duration-base) hover:border-ai-accent hover:bg-ai-surface",
                    page ? "min-h-11 bg-background" : "min-h-9",
                  )}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p role="status" className="sr-only">
          {statusLabel ?? (pending ? "CNS Beauty AI sedang menyiapkan jawaban." : "")}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <AIInput
              id={inputId}
              autoFocus={autoFocusInput}
              value={draft}
              onValueChange={setDraft}
              onSubmit={(text) => void send(text)}
              disabled={pending}
            />
          </div>
          {pending && <IconButton label="Hentikan jawaban" icon={<Square aria-hidden className="size-4" />} onClick={stop} />}
        </div>
        <p className="text-caption text-text-secondary">{AI_COPY.disclaimer}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Slim down `AIPanel`.** In `src/components/ai/ai-panel.tsx`:

  - Keep the dialog open/close effect, the focus-return effect, the Escape handler, the header, and `close`.
  - Remove the hooks that moved: `messages` (keep only a `hasConversation` selector), `pending`, `statusLabel`, `send`, `stop`, `logRef`, `draft`, `setDraft`, `pageContext`, `conversationId`, and the auto-scroll effect.
  - Add the rehydrate effect.

The body becomes:

```tsx
"use client";

import { RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { track } from "@/lib/analytics/client";
import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY } from "@/config/ai";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";

import { ConciergeConversation } from "./concierge-conversation";

const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Beauty Concierge panel. Floating non-modal panel on desktop; full-screen modal on
 * smaller screens. The conversation itself is ConciergeConversation, shared with
 * /beauty-concierge.
 */
export function AIPanel() {
  const open = useUIStore((state) => state.aiPanelOpen);
  const closeAIPanel = useUIStore((state) => state.closeAIPanel);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hasConversation = useAIStore((state) => state.messages.length > 0);
  const reset = useAIStore((state) => state.reset);

  // Mounted on every storefront page: restore this tab's conversation once,
  // after hydration so server HTML and the first client render match.
  useEffect(() => {
    void useAIStore.persist.rehydrate();
  }, []);

  // ...the existing open/close effect and focus-return effect, unchanged...

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={closeAIPanel}
      onKeyDown={(event) => {
        // Modal dialogs get Escape natively; the desktop panel is non-modal.
        if (event.key === "Escape") {
          event.preventDefault();
          ref.current?.close();
        }
      }}
      className="cns-ai-panel"
    >
      <div className="flex h-full flex-col">
        {/* ...the existing header div, unchanged... */}
        <ConciergeConversation variant="panel" onNavigate={close} />
      </div>
    </dialog>
  );
}
```

Copy the two unchanged effects and the header `<div className="flex items-center gap-3 border-b border-border px-5 py-3">…</div>` verbatim from the current file. Don't retype them.

- [ ] **Step 6: Run lint, typecheck, unit tests, and the panel regression**

Run: `npm run lint && npm run typecheck && npm run test && npx playwright test tests/e2e/ai-concierge.spec.ts`
Expected: everything passes, with the same pass/skip counts as Step 1. In particular these must pass: "launcher opens the concierge with quick actions and a focused input", "streams a grounded reply…", "Escape closes the concierge…", and the axe spec.

- [ ] **Step 7: Commit**

```bash
git add src/components/ai/concierge-conversation.tsx src/components/ai/ai-panel.tsx src/components/ai/ai-input.tsx src/components/ai/ai-product-card.tsx
git commit -m "refactor(ai): extract ConciergeConversation shared by panel and page; rehydrate on mount

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Rail model

**Files:**
- Create: `src/features/beauty-concierge/rail-model.ts`
- Modify: `src/config/ai.ts` (rail prompts, input id)
- Test: `tests/unit/concierge-rail-model.test.ts`

**Interfaces:**
- Consumes: `SavedBeautyProfile` (type) from `@/services/quiz/quiz`; `LoyaltySummary` (type) from `@/services/account/account`; `AI_QUICK_ACTIONS` from `@/config/ai`.
- Produces:
  - `CONCIERGE_PAGE_INPUT_ID = "concierge-page-input"` in `@/config/ai`
  - `type RailRoutine = { am: number; pm: number }`
  - `type RailInput = { signedIn: boolean; profile: SavedBeautyProfile | null | undefined; routine: RailRoutine | null | undefined; loyalty: LoyaltySummary | null }`
  - `type RailModel` (below)
  - `buildRailModel(input: RailInput): RailModel`

- [ ] **Step 1: Write the failing tests.** Create `tests/unit/concierge-rail-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildRailModel } from "@/features/beauty-concierge/rail-model";
import type { SavedBeautyProfile } from "@/services/quiz/quiz";

const profile: SavedBeautyProfile = {
  skinType: "Kering",
  concerns: ["Kusam", "Sensitif"],
  sensitivity: null,
  routine: [],
  budget: null,
  updatedAt: "2026-09-30T00:00:00Z",
};
const loyalty = { balance: 1250, lifetimePoints: 3000, tierName: "Glow" };
const ids = (model: ReturnType<typeof buildRailModel>) => model.prompts.map((prompt) => prompt.id);

describe("buildRailModel", () => {
  it("signed out: invites the Skin Quiz and sign-in, general prompts only", () => {
    const model = buildRailModel({ signedIn: false, profile: null, routine: null, loyalty: null });
    expect(model.kind).toBe("signed-out");
    expect(model.summary).toBe("Kenali kulitmu");
    expect(ids(model)).toEqual(["know-my-skin", "find-product", "build-routine"]);
  });

  it("signed in without a profile: Skin Quiz, keeps points", () => {
    const model = buildRailModel({ signedIn: true, profile: null, routine: null, loyalty });
    expect(model).toMatchObject({ kind: "no-profile", summary: "Kenali kulitmu", loyalty });
  });

  it("signed in but the profile read failed: no-profile view, never the sign-in view", () => {
    const model = buildRailModel({ signedIn: true, profile: undefined, routine: undefined, loyalty: null });
    expect(model.kind).toBe("no-profile");
  });

  it("personal: summarises concerns and offers routine consultation", () => {
    const model = buildRailModel({ signedIn: true, profile, routine: { am: 3, pm: 4 }, loyalty });
    expect(model).toMatchObject({
      kind: "personal",
      summary: "Profil kulitmu · 2 concern",
      profile: { skinType: "Kering", concerns: ["Kusam", "Sensitif"] },
      routine: { am: 3, pm: 4 },
      loyalty,
    });
    expect(ids(model)).toEqual(["consult-routine", "concern-products", "order-status"]);
  });

  it("personal without a routine offers to build one; failed reads hide their rows", () => {
    const model = buildRailModel({ signedIn: true, profile, routine: undefined, loyalty: null });
    expect(model).toMatchObject({ kind: "personal", routine: null, loyalty: null });
    expect(ids(model)[0]).toBe("build-my-routine");
    expect(buildRailModel({ signedIn: true, profile, routine: { am: 0, pm: 0 }, loyalty }).prompts[0]?.id).toBe("build-my-routine");
  });

  it("personal summary falls back to skin type, then to a plain label", () => {
    expect(buildRailModel({ signedIn: true, profile: { ...profile, concerns: [] }, routine: null, loyalty: null }).summary).toBe(
      "Profil kulitmu · Kering",
    );
    expect(buildRailModel({ signedIn: true, profile: { ...profile, concerns: [], skinType: null }, routine: null, loyalty: null }).summary).toBe(
      "Profil kulitmu",
    );
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/concierge-rail-model.test.ts`
Expected: FAIL with `Failed to resolve import "@/features/beauty-concierge/rail-model"`.

- [ ] **Step 3: Add the config.** Append to `src/config/ai.ts` (`AIQuickAction` is already imported there):

```ts
/** Fixed id of the /beauty-concierge input, so rail chips can focus it. */
export const CONCIERGE_PAGE_INPUT_ID = "concierge-page-input";

// Rail prompts on /beauty-concierge. Personal ones only appear for a signed-in
// customer with a skin profile; the concierge reads that profile through its
// own RLS tool, so the prompt carries no personal data.
export const CONCIERGE_PERSONAL_PROMPTS = {
  consultRoutine: { id: "consult-routine", label: "Konsultasikan routine saya", prompt: "Tolong cek skincare routine saya dan beri saran perbaikannya." },
  buildMyRoutine: { id: "build-my-routine", label: "Buat routine dari profil saya", prompt: "Buatkan skincare routine berdasarkan profil kulit saya." },
  concernProducts: { id: "concern-products", label: "Produk untuk concern saya", prompt: "Produk apa yang cocok untuk kebutuhan kulit di profil saya?" },
} as const satisfies Record<string, AIQuickAction>;
```

- [ ] **Step 4: Create `src/features/beauty-concierge/rail-model.ts`**

```ts
import { AI_QUICK_ACTIONS, CONCIERGE_PERSONAL_PROMPTS } from "@/config/ai";
import type { LoyaltySummary } from "@/services/account/account";
import type { SavedBeautyProfile } from "@/services/quiz/quiz";
import type { AIQuickAction } from "@/types/ai";

// What the /beauty-concierge rail shows, decided from server reads. Pure, so
// every branch is unit-tested (the E2E suite never signs in).

export type RailRoutine = { am: number; pm: number };

export type RailInput = {
  signedIn: boolean;
  /** undefined = read failed, null = no profile yet. */
  profile: SavedBeautyProfile | null | undefined;
  routine: RailRoutine | null | undefined;
  loyalty: LoyaltySummary | null;
};

export type RailModel =
  | { kind: "signed-out"; summary: string; prompts: readonly AIQuickAction[] }
  | { kind: "no-profile"; summary: string; prompts: readonly AIQuickAction[]; loyalty: LoyaltySummary | null }
  | {
      kind: "personal";
      summary: string;
      prompts: readonly AIQuickAction[];
      profile: { skinType: string | null; concerns: string[] };
      routine: RailRoutine | null;
      loyalty: LoyaltySummary | null;
    };

const GENERAL_PROMPT_IDS = ["know-my-skin", "find-product", "build-routine"];
const GENERAL_PROMPTS = AI_QUICK_ACTIONS.filter((action) => GENERAL_PROMPT_IDS.includes(action.id));
const ORDER_STATUS = AI_QUICK_ACTIONS.filter((action) => action.id === "order-status");

export function buildRailModel({ signedIn, profile, routine, loyalty }: RailInput): RailModel {
  if (!signedIn) return { kind: "signed-out", summary: "Kenali kulitmu", prompts: GENERAL_PROMPTS };
  // A failed profile read looks like "no profile": never offer sign-in to a signed-in customer.
  if (!profile) return { kind: "no-profile", summary: "Kenali kulitmu", prompts: GENERAL_PROMPTS, loyalty };

  const knownRoutine = routine ?? null;
  const hasRoutine = knownRoutine !== null && knownRoutine.am + knownRoutine.pm > 0;
  const summary =
    profile.concerns.length > 0
      ? `Profil kulitmu · ${profile.concerns.length} concern`
      : profile.skinType
        ? `Profil kulitmu · ${profile.skinType}`
        : "Profil kulitmu";

  return {
    kind: "personal",
    summary,
    prompts: [
      hasRoutine ? CONCIERGE_PERSONAL_PROMPTS.consultRoutine : CONCIERGE_PERSONAL_PROMPTS.buildMyRoutine,
      CONCIERGE_PERSONAL_PROMPTS.concernProducts,
      ...ORDER_STATUS,
    ],
    profile: { skinType: profile.skinType, concerns: profile.concerns },
    routine: knownRoutine,
    loyalty,
  };
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run tests/unit/concierge-rail-model.test.ts && npm run typecheck`
Expected: PASS. Every import from the `server-only` service modules is `import type`, so it is erased at compile time and Vitest never loads `server-only`. Keep them as `import type { … }` (not `import { type … }`).

- [ ] **Step 6: Commit**

```bash
git add src/config/ai.ts src/features/beauty-concierge/rail-model.ts tests/unit/concierge-rail-model.test.ts
git commit -m "feat(concierge): rail model for profile, routine and points context

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The `/beauty-concierge` page

**Files:**
- Create: `src/app/(storefront)/beauty-concierge/page.tsx`
- Create: `src/features/beauty-concierge/concierge-rail.tsx`
- Create: `src/features/beauty-concierge/rail-prompt-chips.tsx`
- Create: `src/features/beauty-concierge/concierge-chat.tsx`
- Create: `src/features/beauty-concierge/concierge-page-context.tsx`
- Modify: `src/components/ai/ai-launcher.tsx`
- Modify: `src/app/globals.css` (token)
- Test: `tests/e2e/ai-concierge.spec.ts`

**Interfaces:**
- Consumes:
  - `buildRailModel`, `RailModel` (Task 4); `CONCIERGE_PAGE_INPUT_ID` (Task 4)
  - `ConciergeConversation` (Task 3)
  - `getSessionUserId(): Promise<string | null>` from `@/lib/auth/session`
  - `getQuizOptions()` and `getOwnBeautyProfile(options)` from `@/services/quiz/quiz`
  - `getOwnRoutine()` from `@/services/routine/routine` (returns `OwnRoutine | null | undefined`, with `.view.am` and `.view.pm` arrays)
  - `getLoyaltySummary()` and `type LoyaltySummary` from `@/services/account/account`
- Produces: the route; `ConciergeRail`, `ConciergeRailSkeleton`, `ConciergeChat`, `ConciergePageContext`, `RailPromptChips`.

- [ ] **Step 1: Write the failing E2E specs.** Append to `tests/e2e/ai-concierge.spec.ts`.

A note on the locators: the rail body renders twice, once in the mobile `<details>` and once in the desktop `<div>`, and only one is ever visible. Role queries skip the hidden copy, but `getByText` doesn't. So the mobile specs target the `<summary>` element directly.

```ts
const conciergeReply = [
  { type: "meta", conversationId: null },
  { type: "products", items: [{ slug: "licorice-moisturizer-skin-glow", name: "Licorice Moisturizer", price: 150000, available: true }] },
  { type: "text", delta: "Ini pilihan untuk kulit kusam." },
  { type: "done" },
];
const sse = (events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

test.describe("Beauty Concierge page", () => {
  test("streams a reply inline, sends the concierge page context, and hides the launcher", async ({ page }) => {
    let requestBody: unknown;
    await page.route("**/api/ai/chat", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse(conciergeReply) });
    });
    await page.goto("/beauty-concierge");

    await expect(page.getByRole("heading", { level: 1, name: "Beauty Concierge" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tanya Beauty AI" })).toHaveCount(0);

    const chat = page.getByRole("region", { name: "CNS Beauty AI" });
    await chat.getByRole("button", { name: "Produk untuk kulit kusam" }).click();
    await chat.getByRole("button", { name: "Kirim pesan" }).click();

    const log = chat.getByRole("log");
    await expect(log).toContainText("Ini pilihan untuk kulit kusam.");
    await expect(log.getByRole("link", { name: "Licorice Moisturizer" })).toHaveAttribute("href", "/produk/licorice-moisturizer-skin-glow");
    expect(requestBody).toEqual({
      messages: [{ role: "user", content: "Produk apa yang cocok untuk kulit kusam?" }],
      pageContext: { pageType: "concierge" },
    });
  });

  test("does not focus the input on load", async ({ page }) => {
    await page.goto("/beauty-concierge");
    const input = page.getByRole("region", { name: "CNS Beauty AI" }).getByRole("textbox");
    await expect(input).toBeVisible();
    await expect(input).not.toBeFocused();
  });

  test("keeps the conversation across a reload and continues a panel conversation", async ({ page }) => {
    await page.route("**/api/ai/chat", (route) =>
      route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sse(conciergeReply) }),
    );
    // Start in the floating panel on the homepage.
    await page.goto("/");
    await page.getByRole("button", { name: "Tanya Beauty AI" }).click();
    const panel = page.getByRole("dialog", { name: "CNS Beauty AI" });
    await panel.getByRole("textbox").fill("Kulit saya kusam");
    await panel.getByRole("button", { name: "Kirim pesan" }).click();
    await expect(panel.getByRole("log")).toContainText("Ini pilihan untuk kulit kusam.");

    // Continue on the full page.
    await page.goto("/beauty-concierge");
    const chat = page.getByRole("region", { name: "CNS Beauty AI" });
    const log = chat.getByRole("log");
    await expect(log).toContainText("Kulit saya kusam");
    await expect(log).toContainText("Ini pilihan untuk kulit kusam.");

    await page.reload();
    await expect(log).toContainText("Ini pilihan untuk kulit kusam.");

    // New conversation clears it, including after another reload.
    await chat.getByRole("button", { name: "Mulai percakapan baru" }).click();
    await page.reload();
    await expect(chat.getByRole("list", { name: "Pertanyaan cepat" })).toBeVisible();
    await expect(log).not.toContainText("Kulit saya kusam");
  });

  test("a rail prompt pre-fills and focuses the input", async ({ page, isMobile }) => {
    await page.goto("/beauty-concierge");
    const rail = page.getByRole("complementary", { name: "Profil kecantikanmu" });
    if (isMobile) await rail.locator("summary").click();
    await rail.getByRole("button", { name: "Buat skincare routine" }).click();
    const input = page.getByRole("region", { name: "CNS Beauty AI" }).getByRole("textbox");
    await expect(input).toHaveValue("Buatkan skincare routine untuk saya.");
    await expect(input).toBeFocused();
  });

  test("mobile: the rail is collapsed and nothing scrolls sideways", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile layout");
    await page.goto("/beauty-concierge");
    const rail = page.getByRole("complementary", { name: "Profil kecantikanmu" });
    await expect(rail.locator("summary")).toHaveText("Kenali kulitmu");
    await expect(rail.getByRole("link", { name: "Mulai Skin Quiz" })).toHaveCount(0);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("desktop: rail beside the chat", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop layout");
    await page.goto("/beauty-concierge");
    const rail = page.getByRole("complementary", { name: "Profil kecantikanmu" });
    await expect(rail.getByRole("link", { name: "Mulai Skin Quiz" })).toBeVisible();
    const railBox = await rail.boundingBox();
    const chatBox = await page.getByRole("region", { name: "CNS Beauty AI" }).boundingBox();
    expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(chatBox!.x);
  });

  test("has no WCAG 2.2 AA violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/beauty-concierge");
    // Wait for the streamed rail to replace its skeleton.
    await expect(page.getByRole("complementary", { name: "Profil kecantikanmu" }).locator("summary")).toBeAttached();
    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test.describe("Beauty Concierge page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders its indexable content", async ({ page }) => {
    await page.goto("/beauty-concierge");
    await expect(page.getByRole("heading", { level: 1, name: "Beauty Concierge" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Cara kerja" })).toBeVisible();
    await expect(page).toHaveTitle(/Beauty Concierge/);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx playwright test tests/e2e/ai-concierge.spec.ts -g "Beauty Concierge page"`
Expected: FAIL. The route 404s, so there's no h1.

- [ ] **Step 3: Add the height token.** In `src/app/globals.css`, inside the `:root` block that defines `--ai-panel-height`, add:

```css
  --ai-page-chat-height: min(48rem, calc(100dvh - 8rem));
```

- [ ] **Step 4: Hide the launcher on the page.** Change `src/components/ai/ai-launcher.tsx` to:

```tsx
"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { useUIStore } from "@/stores/ui-store";

/** Persistent concierge entry point. Circle on mobile, pill on desktop. */
export function AILauncher() {
  const open = useUIStore((state) => state.aiPanelOpen);
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  const pathname = usePathname();

  // The full page already is the concierge; one chat surface at a time.
  if (pathname === ROUTES.beautyConcierge) return null;

  // Stays mounted while the panel is open so focus can return to it on close.
  return (
    // ...the existing <button> element, unchanged...
  );
}
```

Copy the existing `<button …>…</button>` verbatim.

- [ ] **Step 5: Create `src/features/beauty-concierge/concierge-page-context.tsx`**

```tsx
"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/client";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";

/** Tells the concierge it runs as the full page, and closes the floating panel. */
export function ConciergePageContext() {
  const setPageContext = useAIStore((state) => state.setPageContext);
  const closeAIPanel = useUIStore((state) => state.closeAIPanel);

  useEffect(() => {
    setPageContext({ pageType: "concierge" });
    closeAIPanel();
    track("AI_OPENED", { properties: { source: "page" } });
    return () => setPageContext(null);
  }, [setPageContext, closeAIPanel]);

  return null;
}
```

- [ ] **Step 6: Create `src/features/beauty-concierge/concierge-chat.tsx`**

```tsx
"use client";

import { RotateCcw, Sparkles } from "lucide-react";

import { ConciergeConversation } from "@/components/ai/concierge-conversation";
import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY, CONCIERGE_PAGE_INPUT_ID } from "@/config/ai";
import { useAIStore } from "@/stores/ai-store";

const TITLE_ID = "concierge-chat-title";

/** The concierge inline on /beauty-concierge; same conversation as the panel. */
export function ConciergeChat() {
  const hasConversation = useAIStore((state) => state.messages.length > 0);
  const reset = useAIStore((state) => state.reset);

  return (
    <section
      aria-labelledby={TITLE_ID}
      className="flex h-(--ai-page-chat-height) min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-ai-surface"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 tablet:px-6">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-pill bg-background text-ai-accent">
          <Sparkles className="size-4" />
        </span>
        <div className="flex-1">
          <h2 id={TITLE_ID} className="font-display text-h4 leading-tight">
            {AI_COPY.name}
          </h2>
          <p className="text-caption text-text-secondary">{AI_COPY.role}</p>
        </div>
        {hasConversation && (
          <IconButton label="Mulai percakapan baru" icon={<RotateCcw aria-hidden className="size-4" />} onClick={reset} />
        )}
      </div>
      <ConciergeConversation variant="page" inputId={CONCIERGE_PAGE_INPUT_ID} autoFocusInput={false} />
    </section>
  );
}
```

`min-h-[28rem]` keeps the chat usable on short landscape phones. `28rem` is 448px, which sits on the 4px grid.

- [ ] **Step 7: Create `src/features/beauty-concierge/rail-prompt-chips.tsx`**

```tsx
"use client";

import { CONCIERGE_PAGE_INPUT_ID } from "@/config/ai";
import { useUIStore } from "@/stores/ui-store";
import type { AIQuickAction } from "@/types/ai";

/** Pre-fills (never sends) a question, then moves focus to the chat input. */
export function RailPromptChips({ prompts }: { prompts: readonly AIQuickAction[] }) {
  const setDraft = useUIStore((state) => state.setAIDraft);

  return (
    <ul aria-label="Tanyakan Beauty AI" className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <li key={prompt.id}>
          <button
            type="button"
            onClick={() => {
              setDraft(prompt.prompt);
              document.getElementById(CONCIERGE_PAGE_INPUT_ID)?.focus();
            }}
            className="min-h-11 rounded-pill border border-border bg-background px-4 text-body-s text-text-primary transition-colors duration-(--duration-base) hover:border-ai-accent hover:bg-ai-surface"
          >
            {prompt.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 8: Create `src/features/beauty-concierge/concierge-rail.tsx`**

```tsx
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { getSessionUserId } from "@/lib/auth/session";
import { getLoyaltySummary, type LoyaltySummary } from "@/services/account/account";
import { getOwnBeautyProfile, getQuizOptions } from "@/services/quiz/quiz";
import { getOwnRoutine } from "@/services/routine/routine";

import { buildRailModel, type RailModel } from "./rail-model";
import { RailPromptChips } from "./rail-prompt-chips";

const SIGN_IN_HREF = `${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.beautyConcierge)}`;

async function loadRailModel(): Promise<RailModel> {
  const userId = await getSessionUserId();
  if (!userId) return buildRailModel({ signedIn: false, profile: null, routine: null, loyalty: null });

  // Every read runs as the customer; RLS is the authorization.
  const [options, routine, loyalty] = await Promise.all([getQuizOptions(), getOwnRoutine(), getLoyaltySummary()]);
  const profile = await getOwnBeautyProfile(options);
  return buildRailModel({
    signedIn: true,
    profile,
    routine: routine ? { am: routine.view.am.length, pm: routine.view.pm.length } : routine,
    loyalty,
  });
}

/** Personal context beside the concierge. Displays only; sends nothing to the AI. */
export async function ConciergeRail() {
  const model = await loadRailModel();
  return (
    <>
      <details className="rounded-lg border border-border bg-surface desktop:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-body-s font-medium">{model.summary}</summary>
        <div className="border-t border-border p-4">
          <RailBody model={model} />
        </div>
      </details>
      <div className="hidden rounded-lg border border-border bg-surface p-5 desktop:block">
        <RailBody model={model} />
      </div>
    </>
  );
}

function RailBody({ model }: { model: RailModel }) {
  if (model.kind !== "personal") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-h4">Kenali kulitmu</h2>
        <p className="text-body-s text-text-secondary">Ikuti Skin Quiz agar Beauty AI bisa memberi saran sesuai profil kulitmu.</p>
        <ButtonLink href={ROUTES.skinQuiz} variant="secondary">
          Mulai Skin Quiz
        </ButtonLink>
        {model.kind === "signed-out" && (
          <p className="text-body-s text-text-secondary">
            <Link href={SIGN_IN_HREF} className="font-medium text-text-primary underline underline-offset-4">
              Masuk
            </Link>{" "}
            agar Beauty AI dapat memakai profil kulit dan rutinitasmu.
          </p>
        )}
        {model.kind === "no-profile" && model.loyalty && <PointsRow loyalty={model.loyalty} />}
        <RailPromptChips prompts={model.prompts} />
      </div>
    );
  }

  const { profile, routine, loyalty } = model;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-h4">Profil kecantikanmu</h2>
      <dl className="flex flex-col gap-3 text-body-s">
        {profile.skinType && (
          <div>
            <dt className="text-text-secondary">Jenis kulit</dt>
            <dd className="font-medium">{profile.skinType}</dd>
          </div>
        )}
        {profile.concerns.length > 0 && (
          <div>
            <dt className="text-text-secondary">Kebutuhan kulit</dt>
            <dd className="font-medium">{profile.concerns.join(", ")}</dd>
          </div>
        )}
        {routine && (
          <div>
            <dt className="text-text-secondary">Rutinitas</dt>
            <dd className="font-medium">
              {routine.am} langkah pagi · {routine.pm} langkah malam
            </dd>
          </div>
        )}
      </dl>
      {loyalty && <PointsRow loyalty={loyalty} />}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-body-s">
        <Link href={ROUTES.account.routine} className="font-medium underline underline-offset-4">
          {routine && routine.am + routine.pm > 0 ? "Lihat rutinitas" : "Buat routine"}
        </Link>
        <Link href={ROUTES.account.skinProfile} className="font-medium underline underline-offset-4">
          Perbarui profil kulit
        </Link>
      </div>
      <RailPromptChips prompts={model.prompts} />
    </div>
  );
}

function PointsRow({ loyalty }: { loyalty: LoyaltySummary }) {
  return (
    <p className="text-body-s">
      <span className="text-text-secondary">CNS Rewards: </span>
      <span className="font-medium">
        {loyalty.balance.toLocaleString("id-ID")} poin{loyalty.tierName ? ` · ${loyalty.tierName}` : ""}
      </span>
    </p>
  );
}

/** Same footprint as the rail, so nothing jumps when it streams in. */
export function ConciergeRailSkeleton() {
  return (
    <>
      <Skeleton className="h-11 w-full desktop:hidden" />
      <div className="hidden flex-col gap-3 rounded-lg border border-border bg-surface p-5 desktop:flex">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-11 w-full" />
      </div>
    </>
  );
}
```

The E2E spec expects the rail to be labelled "Profil kecantikanmu" in every state. That label sits on the `<aside>` in the page (Step 9), not on the `h2`.

- [ ] **Step 9: Create `src/app/(storefront)/beauty-concierge/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { ConciergeChat } from "@/features/beauty-concierge/concierge-chat";
import { ConciergePageContext } from "@/features/beauty-concierge/concierge-page-context";
import { ConciergeRail, ConciergeRailSkeleton } from "@/features/beauty-concierge/concierge-rail";

export const metadata: Metadata = {
  title: "Beauty Concierge",
  description:
    "Konsultasi perawatan kulit dengan CNS Beauty AI: kenali kebutuhan kulitmu, temukan produk yang sesuai, dan susun rutinitas harian.",
  alternates: { canonical: ROUTES.beautyConcierge },
  openGraph: {
    title: "Beauty Concierge CNS Beauty",
    description: "Tanyakan kebutuhan kulitmu dan dapatkan saran perawatan dari CNS Beauty AI.",
  },
};

const STEPS = [
  { title: "Ceritakan kebutuhan kulitmu", body: "Tulis keluhan atau tujuan perawatanmu dengan bahasamu sendiri." },
  { title: "Saran dari katalog resmi", body: "Produk, harga, dan stok diambil langsung dari katalog CNS Beauty, bukan dikarang." },
  { title: "Lanjutkan bersama tim kami", body: "Butuh bantuan lebih? Beauty AI dapat menghubungkanmu dengan tim CNS Beauty lewat WhatsApp." },
] as const;

export default function BeautyConciergePage() {
  return (
    <main id="main-content">
      <ConciergePageContext />
      <Container className="py-8 desktop:py-12">
        <div className="max-w-2xl">
          <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">CNS Beauty AI</p>
          <h1 className="mt-3 text-h1 text-brand-cocoa-dark">Beauty Concierge</h1>
          <p className="mt-3 text-body text-text-secondary">
            Ceritakan kebutuhan kulitmu, dan Beauty AI membantu menemukan produk serta rutinitas CNS Beauty yang sesuai. Beauty AI
            memberi saran perawatan, bukan diagnosis medis.
          </p>
        </div>

        <div className="mt-8 grid gap-6 desktop:grid-cols-3 desktop:items-start">
          <aside aria-label="Profil kecantikanmu" className="desktop:sticky desktop:top-24">
            <Suspense fallback={<ConciergeRailSkeleton />}>
              <ConciergeRail />
            </Suspense>
          </aside>
          <div className="min-w-0 desktop:col-span-2">
            <ConciergeChat />
          </div>
        </div>

        <section aria-labelledby="cara-kerja" className="mt-16">
          <h2 id="cara-kerja" className="text-h2 text-brand-cocoa-dark">
            Cara kerja
          </h2>
          <ol className="mt-6 grid gap-6 tablet:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span aria-hidden className="font-display text-h3 text-ai-accent">
                  {index + 1}
                </span>
                <h3 className="font-display text-h4">{step.title}</h3>
                <p className="text-body-s text-text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </main>
  );
}
```

- [ ] **Step 10: Run the new E2E specs, the panel regression, and the static checks**

Run: `npm run lint && npm run typecheck && npx playwright test tests/e2e/ai-concierge.spec.ts`
Expected: all pass on both the `desktop` (1440px) and `mobile` (Pixel 7) projects; desktop-only and mobile-only specs skip on the other. If axe reports `color-contrast` on the `text-ai-accent` step numbers, change that span to `text-brand-cocoa`, which the design system uses for small accent text.

- [ ] **Step 11: Commit**

```bash
git add "src/app/(storefront)/beauty-concierge/page.tsx" src/features/beauty-concierge src/components/ai/ai-launcher.tsx src/app/globals.css tests/e2e/ai-concierge.spec.ts
git commit -m "feat(concierge): /beauty-concierge full page with inline chat and personal rail

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Clear the conversation on sign-out

**Files:**
- Create: `src/features/auth/sign-out-form.tsx`
- Modify: `src/features/auth/sign-out-button.tsx:1,12-16`
- Test: covered by the Task 2 unit test (`clearStoredConversation removes the key`). There's no E2E, because the suite never signs in.

**Interfaces:**
- Consumes: `clearStoredConversation()` (Task 2), `signOutAction` (existing Server Action in `./actions`).
- Produces: `SignOutForm({ children })`.

- [ ] **Step 1: Create `src/features/auth/sign-out-form.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";

import { clearStoredConversation } from "@/stores/ai-store";

import { signOutAction } from "./actions";

/**
 * Sign-out that also forgets this tab's concierge conversation, so the next
 * person on a shared browser can't read it. Without JavaScript it is still a
 * plain form POST (and nothing was stored).
 */
export function SignOutForm({ children }: { children: ReactNode }) {
  return (
    <form action={signOutAction} onSubmit={() => clearStoredConversation()}>
      {children}
    </form>
  );
}
```

- [ ] **Step 2: Use it in `AccountStrip`.** In `src/features/auth/sign-out-button.tsx`, replace `import { signOutAction } from "./actions";` with `import { SignOutForm } from "./sign-out-form";`, then swap the form element:

```tsx
      <SignOutForm>
        <button type="submit" className="min-h-9 font-medium text-text-primary underline underline-offset-4">
          Keluar
        </button>
      </SignOutForm>
```

- [ ] **Step 3: Check for other sign-out forms**

Run: `grep -rn "signOutAction" src`
Expected: only `actions.ts` (the definition) and `sign-out-form.tsx`. If another form uses it, wrap that one in `SignOutForm` the same way.

- [ ] **Step 4: Run lint, typecheck, and unit tests**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/sign-out-form.tsx src/features/auth/sign-out-button.tsx
git commit -m "feat(auth): forget the stored concierge conversation on sign-out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Docs and full validation

**Files:**
- Modify: `docs/ARCHITECTURE.md` (header lines 5-7; add "Phase 17 summary" above "Phase 16 summary"; add a row to the validation table that has the `| 9 | pass | …` rows)
- Modify: `docs/IMPLEMENTATION_CHECKLIST.md:25`

- [ ] **Step 1: Run full validation and keep the output**

Run: `npm run validate 2>&1 | tail -40 && npx playwright test 2>&1 | tail -15`
Expected: lint, typecheck, unit tests and build pass, and the E2E summary shows 0 failed. Write down the unit test count and the E2E passed/skipped counts for Step 2. If something fails, fix it in the task that owns the code and commit there. Don't paper over it in docs.

- [ ] **Step 2: Update `docs/ARCHITECTURE.md`**

Header lines become:

```markdown
- **Last updated:** 2026-09-30 (Phase 17)
- **Current phase:** Phase 17 Beauty Concierge full page, done and validated
- **Next phase:** Phase 18
```

Add this above `## Phase 16 summary`:

```markdown
## Phase 17 summary

Owner decisions (2026-09-30): a full-page chat (not a landing page or guided flow); the conversation survives a reload through `sessionStorage`; a personal-context side rail. Spec: `docs/superpowers/specs/2026-09-30-beauty-concierge-page-design.md`.

- **`/beauty-concierge`** (Server Component, indexable): h1, intro, a "Cara kerja" section, canonical and Open Graph. The site nav link no longer 404s.
- **One conversation, two surfaces:** `ConciergeConversation` (`src/components/ai/concierge-conversation.tsx`) is the chat body for both the floating panel and the page, on the same `useAIStore`. The launcher is hidden on the page, and an open panel closes.
- **Persistence:** `persist` keeps `conversationId` and the last 20 messages in `sessionStorage` (`cns-ai-conversation`, v1).
  - Writes are gated until rehydration, because persist writes on every set, even before hydrating.
  - Restored data is Zod-validated (https-only handoff links, UUID id), and a reply cut off by the reload comes back as "Jawaban dihentikan."
  - Sign-out clears it.
- **Side rail** (`src/features/beauty-concierge/`): the skin profile, routine step counts and CNS Rewards points, read through RLS with the existing services, behind `<Suspense>`.
  - Signed-out and no-profile visitors get the Skin Quiz CTA. A failed profile read shows the no-profile view.
  - The rail only displays data; the AI reads the same data through its own tools.
  - The decisions live in the pure `buildRailModel`, which is unit-tested.
- **AI context:** new page type `"concierge"` (a hint, never authorization). `AI_OPENED { source: "page" }` fires on the page.
- **Not covered by E2E:** the signed-in rail (the suite never signs in; see Phase 20).
```

In the validation table, add a row for 17 using the counts from Step 1, in the same column format as the existing rows.

- [ ] **Step 3: Tick the checklist.** In `docs/IMPLEMENTATION_CHECKLIST.md`, change `- [ ] Beauty Concierge` to:

```markdown
- [x] Beauty Concierge (Phase 17: full page /beauty-concierge, conversation shared with the panel and kept per tab, personal rail)
```

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md docs/IMPLEMENTATION_CHECKLIST.md
git commit -m "docs: Phase 17 Beauty Concierge summary and validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
