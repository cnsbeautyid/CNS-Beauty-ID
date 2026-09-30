"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { QuizAnswers } from "@/services/quiz/schema";
import type { QuizResult } from "@/services/quiz/quiz";

export type QuizDraft = Partial<QuizAnswers> & { concerns: string[]; routine: string[]; goals: string[] };

type QuizState = {
  step: number;
  answers: QuizDraft;
  result: QuizResult | null;
  saved: boolean;
  setStep: (step: number) => void;
  setAnswer: <K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) => void;
  setResult: (result: QuizResult, saved: boolean) => void;
  markSaved: () => void;
  reset: () => void;
};

const EMPTY: QuizDraft = { concerns: [], routine: [], goals: [] };

/**
 * Quiz progress (UI state). Kept in sessionStorage so a guest who signs in to
 * save their profile comes back to the same answers and result; nothing here
 * is trusted by the server, which re-validates and re-scores.
 */
export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      step: 0,
      answers: EMPTY,
      result: null,
      saved: false,
      setStep: (step) => set({ step }),
      setAnswer: (key, value) => set((state) => ({ answers: { ...state.answers, [key]: value } })),
      setResult: (result, saved) => set({ result, saved }),
      markSaved: () => set({ saved: true }),
      reset: () => set({ step: 0, answers: EMPTY, result: null, saved: false }),
    }),
    // Rehydrated on mount by the quiz (skipHydration avoids an SSR/client mismatch).
    { name: "cns-skin-quiz", storage: createJSONStorage(() => sessionStorage), version: 1, skipHydration: true },
  ),
);
