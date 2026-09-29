"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export function AIHeaderButton({ className }: { className?: string }) {
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  return (
    <Button
      variant="ai"
      size="sm"
      onClick={() => openAIPanel()}
      className={className}
      leadingIcon={<Sparkles aria-hidden className="size-4 text-ai-accent" />}
    >
      Beauty AI
    </Button>
  );
}
