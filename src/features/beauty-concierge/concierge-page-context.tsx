"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/client";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";

/** Tells the concierge it runs as the full page, and closes the floating panel. */
export function ConciergePageContext() {
  const setPageContext = useAIStore((state) => state.setPageContext);
  const closeAIPanel = useUIStore((state) => state.closeAIPanel);

  useEffect(() => {
    setPageContext({ pageType: "concierge" });
    closeAIPanel();
    track("AI_OPENED", { properties: { source: "page" } });
    return () => setPageContext(null);
  }, [setPageContext, closeAIPanel]);

  return null;
}
