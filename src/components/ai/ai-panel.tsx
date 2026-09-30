"use client";

import { RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { track } from "@/lib/analytics/client";
import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY } from "@/config/ai";
import { useConversationSession } from "@/features/ai/use-conversation-session";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";

import { ConciergeConversation } from "./concierge-conversation";

const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Beauty Concierge panel. Floating non-modal panel on desktop; full-screen modal on
 * smaller screens. The conversation itself is ConciergeConversation, shared with
 * /beauty-concierge.
 */
export function AIPanel() {
  const open = useUIStore((state) => state.aiPanelOpen);
  const closeAIPanel = useUIStore((state) => state.closeAIPanel);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hasConversation = useAIStore((state) => state.messages.length > 0);
  const reset = useAIStore((state) => state.reset);

  // Mounted on every storefront page: restore this tab's conversation once
  // (after hydration, so server HTML and the first client render match) and
  // forget it when the signed-in customer changes.
  useConversationSession();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (window.matchMedia(DESKTOP_QUERY).matches) dialog.show();
      else dialog.showModal();
      track("AI_OPENED");
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Dialogs cannot restore focus to the launcher (it was hidden while open),
  // so return it once the commit that closed the panel has shown it again.
  useEffect(() => {
    if (open) return;
    const target = useUIStore.getState().aiReturnFocus;
    if (target?.isConnected) target.focus();
  }, [open]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={closeAIPanel}
      onKeyDown={(event) => {
        // Modal dialogs get Escape natively; the desktop panel is non-modal.
        if (event.key === "Escape") {
          event.preventDefault();
          ref.current?.close();
        }
      }}
      className="cns-ai-panel"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-pill bg-ai-surface text-ai-accent">
            <Sparkles className="size-4" />
          </span>
          <div className="flex-1">
            <h2 id={titleId} className="font-display text-h4 leading-tight">
              {AI_COPY.name}
            </h2>
            <p className="text-caption text-text-secondary">{AI_COPY.role}</p>
          </div>
          {hasConversation && (
            <IconButton label="Mulai percakapan baru" icon={<RotateCcw aria-hidden className="size-4" />} onClick={reset} />
          )}
          <IconButton
            label="Tutup CNS Beauty AI"
            icon={<X aria-hidden className="size-5" />}
            onClick={() => ref.current?.close()}
          />
        </div>

        <ConciergeConversation variant="panel" onNavigate={close} />
      </div>
    </dialog>
  );
}
