import type { ReactNode } from "react";

import { AILauncher } from "@/components/ai/ai-launcher";
import { AIPanel } from "@/components/ai/ai-panel";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { QueryProvider } from "@/components/providers/query-provider";

// Customer-facing shell. Account, reseller portal and admin get their own
// layouts in later phases.
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AnnouncementBar />
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <AILauncher />
      <AIPanel />
      <PageViewTracker />
    </QueryProvider>
  );
}
