"use client";

import { create } from "zustand";

type UIState = {
  aiPanelOpen: boolean;
  /** Element focused when the panel opened; focus returns here on close. */
  aiReturnFocus: HTMLElement | null;
  openAIPanel: () => void;
  closeAIPanel: () => void;
};

// UI state only. Conversation/AI state lives in its own store (Phase 9);
// server data lives in TanStack Query.
export const useUIStore = create<UIState>()((set) => ({
  aiPanelOpen: false,
  aiReturnFocus: null,
  openAIPanel: () =>
    set({
      aiPanelOpen: true,
      // Captured before re-render: the launcher hides and would drop focus.
      aiReturnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    }),
  closeAIPanel: () => set({ aiPanelOpen: false }),
}));
