"use client";

import { MessageCircle, RotateCcw, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { track } from "@/lib/analytics/client";
import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY, AI_QUICK_ACTIONS } from "@/config/ai";
import { ROUTES } from "@/constants/routes";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";

import { AIInput } from "./ai-input";
import { AIMessage } from "./ai-message";
import { AIProductCards } from "./ai-product-card";
import { AIThinkingIndicator } from "./ai-thinking-indicator";

const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Beauty Concierge. Floating non-modal panel on desktop; full-screen modal on
 * smaller screens. Replies stream from /api/ai/chat; product cards and the
 * WhatsApp handoff come from tool data, never from model text.
 */
export function AIPanel() {
  const open = useUIStore((state) => state.aiPanelOpen);
  const closeAIPanel = useUIStore((state) => state.closeAIPanel);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messages = useAIStore((state) => state.messages);
  const pending = useAIStore((state) => state.pending);
  const statusLabel = useAIStore((state) => state.statusLabel);
  const send = useAIStore((state) => state.send);
  const stop = useAIStore((state) => state.stop);
  const reset = useAIStore((state) => state.reset);
  const logRef = useRef<HTMLDivElement>(null);
  // In the store so "ask AI" buttons elsewhere can pre-fill a question.
  const draft = useUIStore((state) => state.aiDraft);
  const setDraft = useUIStore((state) => state.setAIDraft);
  const pageContext = useAIStore((state) => state.pageContext);
  const conversationId = useAIStore((state) => state.conversationId);

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

  // Keep the newest content in view while a reply streams in.
  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length, lastContent, statusLabel]);

  const hasConversation = messages.length > 0;
  const offeredWhatsApp = messages.some((message) => message.handoffUrl);
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

        {pageContext?.productName && (
          <p className="border-b border-border bg-ai-surface px-5 py-2 text-caption text-text-secondary">
            Kamu sedang melihat <span className="font-medium text-text-primary">{pageContext.productName}</span>
          </p>
        )}

        {/* aria-busy holds announcements until a streamed reply is complete. */}
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={pending}
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
        >
          <AIMessage role="assistant">{AI_COPY.greeting}</AIMessage>
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-2">
              {message.content && (
                <AIMessage role={message.role} notice={message.state === "error" || message.state === "unavailable"}>
                  {message.content}
                </AIMessage>
              )}
              {message.state === "streaming" && (!message.content || statusLabel) && <AIThinkingIndicator label={statusLabel} />}
              {message.products.length > 0 && <AIProductCards products={message.products} conversationId={conversationId} onNavigate={close} />}
              {message.handoffUrl && (
                <a
                  href={message.handoffUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 self-start rounded-pill border border-primary px-4 py-2 text-body-s font-medium text-text-primary transition-colors duration-(--duration-base) hover:bg-secondary"
                >
                  <MessageCircle aria-hidden className="size-4" />
                  Chat tim CNS Beauty di WhatsApp
                  <span className="sr-only">(membuka WhatsApp)</span>
                </a>
              )}
            </div>
          ))}
          {hasConversation && !offeredWhatsApp && (
            <Link
              href={ROUTES.contact}
              onClick={close}
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
          <p role="status" className="sr-only">
            {statusLabel ?? (pending ? "CNS Beauty AI sedang menyiapkan jawaban." : "")}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AIInput value={draft} onValueChange={setDraft} onSubmit={(text) => void send(text)} disabled={pending} />
            </div>
            {pending && <IconButton label="Hentikan jawaban" icon={<Square aria-hidden className="size-4" />} onClick={stop} />}
          </div>
          <p className="text-caption text-text-secondary">{AI_COPY.disclaimer}</p>
        </div>
      </div>
    </dialog>
  );
}
