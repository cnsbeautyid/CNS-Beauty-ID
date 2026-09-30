import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { AccountNav } from "@/features/account/account-nav";
import { AccountStrip } from "@/features/auth/sign-out-button";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Every page below re-checks the session with requireUser(); this layout only
// frames the area. Authorization for data is RLS, per query.
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  return (
    <main id="main-content">
      <Container className="py-10 desktop:py-16">
        <div className="grid gap-8 desktop:grid-cols-4 desktop:gap-12">
          <aside className="flex flex-col gap-6 desktop:col-span-1">
            <AccountNav />
            {user && (
              <div className="hidden desktop:block">
                <AccountStrip email={user.email} />
              </div>
            )}
          </aside>
          <div className="min-w-0 desktop:col-span-3">{children}</div>
        </div>
      </Container>
    </main>
  );
}
