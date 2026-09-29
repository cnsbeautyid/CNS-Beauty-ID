"use client";

import { useEffect } from "react";

import { useAIStore } from "@/stores/ai-store";
import type { AIPageContext } from "@/types/ai";

/** Tells the concierge which page is open, so customers needn't repeat it. */
export function AIContextSetter({ context }: { context: AIPageContext }) {
  const setPageContext = useAIStore((state) => state.setPageContext);
  const { pageType, productId, productSlug, productName, categoryId } = context;

  useEffect(() => {
    setPageContext({ pageType, productId, productSlug, productName, categoryId });
    return () => setPageContext(null);
  }, [setPageContext, pageType, productId, productSlug, productName, categoryId]);

  return null;
}
