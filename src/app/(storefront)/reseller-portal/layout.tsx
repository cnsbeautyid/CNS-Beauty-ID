import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { PortalNav } from "@/features/reseller/portal-nav";

export const metadata: Metadata = {
  title: { template: "%s · Portal Partner | CNS Beauty", default: "Portal Partner | CNS Beauty" },
  robots: { index: false, follow: false },
};

// Every page below re-checks the session and the partner account with
// requirePartner(); this layout only frames the area.
export default function ResellerPortalLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content">
      <Container className="py-10 desktop:py-16">
        <p className="mb-6 text-caption tracking-eyebrow text-brand-cocoa uppercase">Portal Partner CNS Beauty</p>
        <div className="grid gap-8 desktop:grid-cols-4 desktop:gap-12">
          <aside className="desktop:col-span-1">
            <PortalNav />
          </aside>
          <div className="min-w-0 desktop:col-span-3">{children}</div>
        </div>
      </Container>
    </main>
  );
}
