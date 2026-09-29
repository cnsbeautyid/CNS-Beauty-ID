import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type CardProps = {
  as?: "div" | "article" | "section" | "li";
  tone?: "default" | "surface" | "ai";
  padding?: "none" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

const TONES = {
  default: "bg-background border border-border",
  surface: "bg-surface border border-border",
  ai: "bg-ai-surface border border-border",
};

const PADDING = { none: "", md: "p-5", lg: "p-6 desktop:p-8" };

export function Card({ as: Tag = "div", tone = "default", padding = "md", className, children }: CardProps) {
  return <Tag className={cn("rounded-lg", TONES[tone], PADDING[padding], className)}>{children}</Tag>;
}
