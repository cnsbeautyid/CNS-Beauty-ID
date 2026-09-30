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
