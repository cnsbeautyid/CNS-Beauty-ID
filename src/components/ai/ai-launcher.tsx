"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { useUIStore } from "@/stores/ui-store";

/** Persistent concierge entry point. Circle on mobile, pill on desktop. */
export function AILauncher() {
  const open = useUIStore((state) => state.aiPanelOpen);
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  const pathname = usePathname();

  // The full page already is the concierge; one chat surface at a time.
  if (pathname === ROUTES.beautyConcierge) return null;

  // Stays mounted while the panel is open so focus can return to it on close.
  return (
    <button
      type="button"
      hidden={open}
      onClick={() => openAIPanel()}
      className="fixed right-4 bottom-(--fab-bottom) z-30 inline-flex size-14 items-center justify-center gap-2 rounded-pill bg-primary text-body-s font-medium text-on-primary shadow-md transition-colors duration-(--duration-base) hover:bg-brand-cocoa-dark desktop:right-6 desktop:bottom-6 desktop:h-12 desktop:w-auto desktop:px-5"
    >
      <Sparkles aria-hidden className="size-5 desktop:size-4" />
      <span className="sr-only desktop:not-sr-only">Tanya Beauty AI</span>
    </button>
  );
}
