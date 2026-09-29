"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

type AskAIButtonProps = {
  /** Question placed in the concierge input (the customer still sends it). */
  prefill?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

/** Any "ask Beauty AI" call to action. Opens the persistent concierge panel. */
export function AskAIButton({ prefill, variant = "ai", size, fullWidth, className, children }: AskAIButtonProps) {
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      leadingIcon={<Sparkles aria-hidden className="size-4" />}
      onClick={() => openAIPanel(prefill)}
    >
      {children}
    </Button>
  );
}

/** Compact chip that opens the concierge with a starter question. */
export function AskAIChip({ prefill, children }: { prefill: string; children: ReactNode }) {
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  return (
    <button
      type="button"
      onClick={() => openAIPanel(prefill)}
      className="min-h-11 rounded-pill border border-border bg-background px-4 text-body-s text-text-primary transition-colors duration-(--duration-base) hover:border-ai-accent"
    >
      {children}
    </button>
  );
}
