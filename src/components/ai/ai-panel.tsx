"use client";

import { MessageCircle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY, AI_QUICK_ACTIONS } from "@/config/ai";
import { ROUTES } from "@/constants/routes";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";

import { AIInput } from "./ai-input";
import { AIMessage, type AIChatMessage } from "./ai-message";

const DESKTOP_QUERY = "(min-width: 64rem)";

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

/**
 * Concierge shell. Floating non-modal panel on desktop; full-screen modal on
 * smaller screens. Replies are a fixed "not yet available" notice with a
 * human handoff until the streaming backend lands in Phase 9.
 */
export function AIPanel() {
  const open = useUIStore((state) => state.aiPanelOpen);
  const closeAIPanel = useUIStore((state) => state.closeAIPanel);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  // In the store so "ask AI" buttons elsewhere can pre-fill a question.
  const draft = useUIStore((state) => state.aiDraft);
  const setDraft = useUIStore((state) => state.setAIDraft);
  const pageContext = useAIStore((state) => state.pageContext);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (window.matchMedia(DESKTOP_QUERY).matches) dialog.show();
      else dialog.showModal();
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

  const send = (text: string) => {
    setMessages((current) => [
      ...current,
      { id: nextId(), role: "user", content: text },
      { id: nextId(), role: "assistant", content: AI_COPY.unavailable },
    ]);
  };

  const hasConversation = messages.length > 0;

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
          <IconButton
            label="Tutup CNS Beauty AI"
            icon={<X aria-hidden className="size-5" />}
            onClick={() => ref.current?.close()}
          />
        </div>

        {pageContext?.productName && (
          <p className="border-b border-border bg-ai-surface px-5 py-2 text-caption text-text-secondary">
            Kamu sedang melihat <span className="font-medium text-text-primary">{pageContext.productName}</span>
          </p>
        )}

        <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
          <AIMessage role="assistant">{AI_COPY.greeting}</AIMessage>
          {messages.map((message) => (
            <AIMessage key={message.id} role={message.role}>
              {message.content}
            </AIMessage>
          ))}
          {hasConversation && (
            <Link
              href={ROUTES.contact}
              onClick={() => ref.current?.close()}
              className="inline-flex items-center gap-2 self-start text-body-s font-medium text-brand-cocoa underline underline-offset-4"
            >
              <MessageCircle aria-hidden className="size-4" />
              Hubungi tim CNS Beauty
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 pt-4 pb-(--fab-bottom)">
          {!hasConversation && (
            <ul aria-label="Pertanyaan cepat" className="flex flex-wrap gap-2">
              {AI_QUICK_ACTIONS.map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => setDraft(action.prompt)}
                    className="min-h-9 rounded-pill border border-border px-3 text-caption text-text-primary transition-colors duration-(--duration-base) hover:border-ai-accent hover:bg-ai-surface"
                  >
                    {action.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <AIInput value={draft} onValueChange={setDraft} onSubmit={send} />
          <p className="text-caption text-text-secondary">{AI_COPY.disclaimer}</p>
        </div>
      </div>
    </dialog>
  );
}
