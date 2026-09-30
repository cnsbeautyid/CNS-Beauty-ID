"use client";

import { MessageCircle, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { AI_COPY, AI_QUICK_ACTIONS } from "@/config/ai";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";
import type { AIQuickAction } from "@/types/ai";

import { AIInput } from "./ai-input";
import { AIMessage } from "./ai-message";
import { AIProductCards } from "./ai-product-card";
import { AIThinkingIndicator } from "./ai-thinking-indicator";

type ConciergeConversationProps = {
  /** Spacing and product-card density only; behavior is identical. */
  variant: "panel" | "page";
  /** Called when a card or link navigates away (the panel closes itself). */
  onNavigate?: () => void;
  quickActions?: readonly AIQuickAction[];
  inputId?: string;
  autoFocusInput?: boolean;
};

/**
 * The concierge conversation, shared by the floating panel and /beauty-concierge.
 * Replies stream from /api/ai/chat; product cards and the WhatsApp handoff come
 * from tool data, never from model text.
 */
export function ConciergeConversation({
  variant,
  onNavigate,
  quickActions = AI_QUICK_ACTIONS,
  inputId,
  autoFocusInput = true,
}: ConciergeConversationProps) {
  const messages = useAIStore((state) => state.messages);
  const pending = useAIStore((state) => state.pending);
  const statusLabel = useAIStore((state) => state.statusLabel);
  const send = useAIStore((state) => state.send);
  const stop = useAIStore((state) => state.stop);
  const pageContext = useAIStore((state) => state.pageContext);
  const conversationId = useAIStore((state) => state.conversationId);
  // In the store so "ask AI" buttons and rail chips elsewhere can pre-fill a question.
  const draft = useUIStore((state) => state.aiDraft);
  const setDraft = useUIStore((state) => state.setAIDraft);
  const logRef = useRef<HTMLDivElement>(null);
  const page = variant === "page";

  // Keep the newest content in view while a reply streams in.
  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length, lastContent, statusLabel]);

  const hasConversation = messages.length > 0;
  const offeredWhatsApp = messages.some((message) => message.handoffUrl);
  const gutter = page ? "px-4 tablet:px-6" : "px-5";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pageContext?.productName && (
        <p className={cn("border-b border-border bg-ai-surface py-2 text-caption text-text-secondary", gutter)}>
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
        className={cn("flex flex-1 flex-col gap-3 overflow-y-auto py-5", gutter)}
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
            {message.products.length > 0 && (
              <AIProductCards
                products={message.products}
                conversationId={conversationId}
                onNavigate={onNavigate}
                layout={page ? "grid" : "scroll"}
              />
            )}
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
            onClick={onNavigate}
            className="inline-flex items-center gap-2 self-start text-body-s font-medium text-brand-cocoa underline underline-offset-4"
          >
            <MessageCircle aria-hidden className="size-4" />
            Hubungi tim CNS Beauty
          </Link>
        )}
      </div>

      <div className={cn("flex flex-col gap-3 border-t border-border pt-4", gutter, page ? "pb-4" : "pb-(--fab-bottom)")}>
        {!hasConversation && (
          <ul aria-label="Pertanyaan cepat" className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => setDraft(action.prompt)}
                  className={cn(
                    "rounded-pill border border-border px-3 text-caption text-text-primary transition-colors duration-(--duration-base) hover:border-ai-accent hover:bg-ai-surface",
                    page ? "min-h-11 bg-background" : "min-h-9",
                  )}
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
            <AIInput
              id={inputId}
              autoFocus={autoFocusInput}
              value={draft}
              onValueChange={setDraft}
              onSubmit={(text) => void send(text)}
              disabled={pending}
            />
          </div>
          {pending && <IconButton label="Hentikan jawaban" icon={<Square aria-hidden className="size-4" />} onClick={stop} />}
        </div>
        <p className="text-caption text-text-secondary">{AI_COPY.disclaimer}</p>
      </div>
    </div>
  );
}
