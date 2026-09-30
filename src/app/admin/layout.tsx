import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { AdminNav } from "@/features/admin/admin-nav";
import { AccountStrip } from "@/features/auth/sign-out-button";
import { getStaff } from "@/services/admin/auth";

export const metadata: Metadata = {
  title: { template: "%s · Admin | CNS Beauty", default: "Admin | CNS Beauty" },
  robots: { index: false, follow: false },
};

// Chrome only for verified staff; every page also calls requireStaff(), which
// redirects guests to sign-in and returns 404 to signed-in non-staff.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaff();
  if (!staff) return <>{children}</>;

  return (
    <>
      <header className="border-b border-border bg-background">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link href={ROUTES.admin.dashboard} className="font-display text-h4 text-brand-cocoa-dark">
            CNS Beauty <span className="text-body-s font-medium tracking-eyebrow text-text-secondary uppercase">Admin</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-caption text-text-secondary">{staff.isOwner ? "Owner" : "Admin"}</span>
            <Link href={ROUTES.home} className="text-body-s font-medium underline underline-offset-4">
              Lihat toko
            </Link>
            <AccountStrip email={staff.email} />
          </div>
        </Container>
      </header>
      <main id="main-content" className="flex-1 bg-surface">
        <Container className="py-8 desktop:py-12">
          <div className="grid gap-8 desktop:grid-cols-5 desktop:gap-10">
            <aside className="desktop:col-span-1">
              <AdminNav />
            </aside>
            <div className="min-w-0 desktop:col-span-4">{children}</div>
          </div>
        </Container>
      </main>
    </>
  );
}
