import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "brand" | "ai" | "success" | "error";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-secondary text-text-primary",
  brand: "bg-brand-blush-soft text-brand-cocoa-dark",
  ai: "bg-ai-surface text-text-primary",
  success: "bg-secondary text-success",
  error: "bg-secondary text-error",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium tracking-wider uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
