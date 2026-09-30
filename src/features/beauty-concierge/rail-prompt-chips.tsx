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
