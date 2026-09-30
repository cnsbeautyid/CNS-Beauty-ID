"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { pageTypeFromPath } from "@/features/ai/chat-client";
import { track } from "@/lib/analytics/client";

/** PAGE_VIEWED on first load and on every client-side navigation. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) track("PAGE_VIEWED", { properties: { pageType: pageTypeFromPath(pathname) } });
  }, [pathname]);
  return null;
}
