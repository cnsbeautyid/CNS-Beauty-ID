"use client";

import { create } from "zustand";

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
  openAIPanel: (prefill) =>
    set((state) => ({
      aiPanelOpen: true,
      aiDraft: prefill ?? state.aiDraft,
      // Captured before re-render: the launcher hides and would drop focus.
      aiReturnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    })),
  closeAIPanel: () => set({ aiPanelOpen: false }),
  setAIDraft: (aiDraft) => set({ aiDraft }),
}));
