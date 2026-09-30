"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isActivePath } from "@/lib/utils/nav";

// Loyalty, Skin Profile and Routine join this list in their own phases
// (13, 11, 12); links to pages that don't exist yet are not shown.
const ITEMS = [
  { href: ROUTES.account.dashboard, label: "Ringkasan", exact: true },
  { href: ROUTES.account.orders, label: "Pesanan", exact: false },
  { href: ROUTES.account.wishlist, label: "Wishlist", exact: false },
  { href: ROUTES.account.settings, label: "Pengaturan", exact: false },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Akun">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 desktop:mx-0 desktop:flex-col desktop:overflow-visible desktop:px-0">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-4 text-body-s transition-colors duration-(--duration-base)",
                  active ? "bg-secondary font-medium text-text-primary" : "text-text-secondary hover:bg-surface hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
