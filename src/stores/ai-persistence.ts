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
