"use client";

import { create } from "zustand";

import { ChatHttpError, pageTypeFromPath, streamChat } from "@/features/ai/chat-client";
import { MAX_HISTORY, type AIProductCard, type ChatRequest, type ConciergeEvent } from "@/services/ai/protocol";
import type { AIPageContext } from "@/types/ai";

export type ConciergeMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products: AIProductCard[];
  /** Set when the concierge offers the human team (null: no WhatsApp configured). */
  handoffUrl?: string | null;
  state: "streaming" | "done" | "error" | "unavailable";
};

type AIState = {
  /** What the customer is looking at. Context only, never authorization. */
  pageContext: AIPageContext | null;
  setPageContext: (context: AIPageContext | null) => void;
  messages: ConciergeMessage[];
  conversationId: string | null;
  pending: boolean;
  /** Label of the controlled tool currently running (never model reasoning). */
  statusLabel: string | null;
  send: (text: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
};

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${++seq}`;
let controller: AbortController | null = null;

const NETWORK_ERROR = "Koneksi ke CNS Beauty AI terputus. Silakan coba lagi, atau hubungi tim kami.";
const RATE_LIMITED = "Terlalu banyak pesan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.";

function toRequestContext(context: AIPageContext | null): ChatRequest["pageContext"] {
  if (context?.pageType === "product" && context.productSlug) {
    return { pageType: "product", productSlug: context.productSlug, productName: context.productName?.slice(0, 120) };
  }
  return { pageType: context?.pageType ?? pageTypeFromPath(window.location.pathname) };
}

// AI state (CLAUDE.md §5), separate from UI state (ui-store) and server state.
export const useAIStore = create<AIState>()((set, get) => {
  const updateLast = (update: (message: ConciergeMessage) => ConciergeMessage) =>
    set((state) => ({ messages: state.messages.map((message, index) => (index === state.messages.length - 1 ? update(message) : message)) }));

  const apply = (event: ConciergeEvent) => {
    switch (event.type) {
      case "meta":
        set({ conversationId: event.conversationId });
        break;
      case "status":
        set({ statusLabel: event.label });
        break;
      case "text":
        set({ statusLabel: null });
        updateLast((message) => ({ ...message, content: message.content + event.delta }));
        break;
      case "products":
        updateLast((message) => {
          const known = new Set(message.products.map((product) => product.slug));
          return { ...message, products: [...message.products, ...event.items.filter((item) => !known.has(item.slug))] };
        });
        break;
      case "handoff":
        updateLast((message) => ({ ...message, handoffUrl: event.url }));
        break;
      case "unavailable":
        updateLast((message) => ({ ...message, content: event.message, state: "unavailable" }));
        break;
      case "error":
        updateLast((message) => ({ ...message, content: message.content ? `${message.content}\n\n${event.message}` : event.message, state: "error" }));
        break;
      case "done":
        updateLast((message) => (message.state === "streaming" ? { ...message, state: "done" } : message));
        break;
    }
  };

  return {
    pageContext: null,
    setPageContext: (pageContext) => set({ pageContext }),
    messages: [],
    conversationId: null,
    pending: false,
    statusLabel: null,

    async send(text) {
      if (get().pending) return;
      // Only completed turns go back as context; errors and notices don't.
      const history = get()
        .messages.filter((message) => message.state === "done" && message.content.trim())
        .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }))
        .slice(-(MAX_HISTORY - 1));

      set((state) => ({
        pending: true,
        statusLabel: null,
        messages: [
          ...state.messages,
          { id: nextId(), role: "user", content: text, products: [], state: "done" },
          { id: nextId(), role: "assistant", content: "", products: [], state: "streaming" },
        ],
      }));

      controller = new AbortController();
      try {
        await streamChat(
          {
            conversationId: get().conversationId ?? undefined,
            messages: [...history, { role: "user", content: text }],
            pageContext: toRequestContext(get().pageContext),
          },
          apply,
          controller.signal,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          // Stopped by the customer: keep what arrived, but don't send it back as context.
          updateLast((message) => ({ ...message, content: message.content || "Jawaban dihentikan.", state: "error" }));
        } else {
          apply({ type: "error", message: error instanceof ChatHttpError && error.status === 429 ? RATE_LIMITED : NETWORK_ERROR });
        }
      } finally {
        controller = null;
        apply({ type: "done" });
        set({ pending: false, statusLabel: null });
      }
    },

    stop() {
      controller?.abort();
    },

    reset() {
      controller?.abort();
      set({ messages: [], conversationId: null, pending: false, statusLabel: null });
    },
  };
});
