import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type AIChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AIMessage({ role, notice = false, children }: { role: AIChatMessage["role"]; notice?: boolean; children: ReactNode }) {
  const fromUser = role === "user";
  return (
    <div className={cn("flex", fromUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3 text-body-s whitespace-pre-line break-words",
          fromUser
            ? "rounded-br-sm bg-primary text-on-primary"
            : notice
              ? "rounded-bl-sm border border-border bg-background text-text-primary"
              : "rounded-bl-sm bg-ai-surface text-text-primary",
        )}
      >
        <span className="sr-only">{fromUser ? "Kamu: " : "CNS Beauty AI: "}</span>
        {children}
      </div>
    </div>
  );
}
