import { z } from "zod";
import type { StateStorage } from "zustand/middleware";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { MAX_HISTORY, productCardSchema, type AIProductCard } from "@/services/ai/protocol";
import { resolveImageUrl } from "@/services/catalog/mapper";

import type { ConciergeMessage } from "./ai-store";

// Keeps the concierge conversation across a reload for the life of the tab
// (sessionStorage). Only what the customer already sees is stored: no tokens,
// no identity, no prices beyond the tool-sourced cards on screen.

export const AI_CONVERSATION_STORAGE_KEY = "cns-ai-conversation";
export const STOPPED_REPLY = "Jawaban dihentikan.";

// Replies can gather cards over several tool rounds; storage keeps the first ones.
const MAX_STORED_PRODUCTS = 24;

export type PersistedConversation = {
  conversationId: string | null;
  /** Hash of the signed-in user who owns it (null: a guest). Never the raw id. */
  ownerKey: string | null;
  messages: ConciergeMessage[];
};

const messageSchema = z.object({
  id: z.string().max(64),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20_000),
  products: z.array(productCardSchema).max(MAX_STORED_PRODUCTS),
  // Rendered as a link: only https, so a tampered value can't become javascript:.
  handoffUrl: z.string().regex(/^https:\/\//).nullable().optional(),
  state: z.enum(["streaming", "done", "error", "unavailable"]),
});

const persistedSchema = z.object({
  conversationId: z.uuid().nullable(),
  ownerKey: z.string().max(32).nullable().optional(),
  messages: z.array(messageSchema).max(MAX_HISTORY),
});

export function toPersisted(state: PersistedConversation): PersistedConversation {
  return {
    conversationId: state.conversationId,
    ownerKey: state.ownerKey,
    messages: state.messages.slice(-MAX_HISTORY).map((message) => ({ ...message, products: message.products.slice(0, MAX_STORED_PRODUCTS) })),
  };
}

/** Validated stored conversation, or null when it is missing or invalid. */
export function restorePersisted(value: unknown): PersistedConversation | null {
  const parsed = persistedSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    conversationId: parsed.data.conversationId,
    ownerKey: parsed.data.ownerKey ?? null,
    // A reply cut off by the reload is shown as stopped and never sent back as context.
    messages: parsed.data.messages.map((message) =>
      withShopImages(message.state === "streaming" ? { ...message, content: message.content || STOPPED_REPLY, state: "error" } : message),
    ),
  };
}

// Cards come from tool data, but storage can be edited: only images from the
// shop's own public Storage reach next/image (same rule as the catalog).
function withShopImages<T extends { products: AIProductCard[] }>(message: T): T {
  const supabaseUrl = getSupabasePublicConfig()?.url;
  return {
    ...message,
    products: message.products.map(({ imageUrl, ...card }) => {
      const safe = resolveImageUrl(imageUrl, supabaseUrl);
      return safe ? { ...card, imageUrl: safe } : card;
    }),
  };
}

/** Stable, non-reversible-at-a-glance key for "who owns this conversation". */
export function ownerKeyFor(userId: string | null): string | null {
  if (!userId) return null;
  // FNV-1a: only compared for equality in this tab, never used for authorization.
  let hash = 0x811c9dc5;
  for (let index = 0; index < userId.length; index++) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `o${hash.toString(36)}`;
}

/**
 * What to do with the stored conversation when the signed-in user is known:
 * a guest's conversation carries over after signing in; anyone else's
 * (including after sign-out or session expiry) is cleared.
 */
export function resolveOwner(stored: string | null, hasMessages: boolean, current: string | null): "keep" | "adopt" | "clear" {
  if (stored === current) return "keep";
  if (!hasMessages || stored === null) return "adopt";
  return "clear";
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
