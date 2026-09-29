"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/config/site";
import { cn } from "@/lib/utils/cn";
import { isActivePath } from "@/lib/utils/nav";

export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-1 wide:gap-3">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center px-3 text-body-s tracking-wide transition-colors duration-(--duration-base)",
                "decoration-brand-rose-gold decoration-1 underline-offset-8",
                active ? "text-brand-cocoa underline" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
