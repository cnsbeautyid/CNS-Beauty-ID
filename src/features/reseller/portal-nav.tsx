"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isActivePath } from "@/lib/utils/nav";

const ITEMS = [
  { href: ROUTES.resellerPortal.dashboard, label: "Ringkasan", exact: true },
  { href: ROUTES.resellerPortal.products, label: "Produk & Harga", exact: false },
  { href: ROUTES.resellerPortal.orders, label: "Pesanan", exact: false },
  { href: ROUTES.resellerPortal.ai, label: "Asisten AI", exact: false },
] as const;

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal partner">
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
