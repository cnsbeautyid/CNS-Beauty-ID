"use client";

import { create } from "zustand";

import { CONCIERGE_PAGE_INPUT_ID } from "@/config/ai";
import { ROUTES } from "@/constants/routes";

type UIState = {
  aiPanelOpen: boolean;
  /** Unsent text in the concierge input; survives closing the panel. */
  aiDraft: string;
  /** Element focused when the panel opened; focus returns here on close. */
  aiReturnFocus: HTMLElement | null;
  /** Opens the concierge, optionally pre-filling the input (not sending it). */
  openAIPanel: (prefill?: string) => void;
  closeAIPanel: () => void;
  setAIDraft: (draft: string) => void;
};

// UI state only. Conversation/AI state lives in its own store (Phase 9);
// server data lives in TanStack Query.
export const useUIStore = create<UIState>()((set) => ({
  aiPanelOpen: false,
  aiDraft: "",
  aiReturnFocus: null,
  openAIPanel: (prefill) => {
    // /beauty-concierge already shows the chat inline: one live chat surface at a
    // time, so "ask AI" entry points hand the question to it instead.
    if (window.location.pathname === ROUTES.beautyConcierge) {
      if (prefill !== undefined) set({ aiDraft: prefill });
      document.getElementById(CONCIERGE_PAGE_INPUT_ID)?.focus();
      return;
    }
    set((state) => ({
      aiPanelOpen: true,
      aiDraft: prefill ?? state.aiDraft,
      // Captured before re-render: the launcher hides and would drop focus.
      aiReturnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    }));
  },
  closeAIPanel: () => set({ aiPanelOpen: false }),
  setAIDraft: (aiDraft) => set({ aiDraft }),
}));
