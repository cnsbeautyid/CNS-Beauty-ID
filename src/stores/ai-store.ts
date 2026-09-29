"use client";

import { create } from "zustand";

import type { AIPageContext } from "@/types/ai";

type AIState = {
  /** What the customer is looking at. Context only, never authorization. */
  pageContext: AIPageContext | null;
  setPageContext: (context: AIPageContext | null) => void;
};

// AI state (CLAUDE.md §5), separate from UI state. Conversation, intent and
// streaming state join this store in Phase 9.
export const useAIStore = create<AIState>()((set) => ({
  pageContext: null,
  setPageContext: (pageContext) => set({ pageContext }),
}));
