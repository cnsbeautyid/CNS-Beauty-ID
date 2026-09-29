"use client";

import { Heart, Menu, Search, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { PRIMARY_NAV } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { isActivePath } from "@/lib/utils/nav";
import { useUIStore } from "@/stores/ui-store";

const SECONDARY = [
  { label: "Cari produk", href: ROUTES.products, icon: Search },
  { label: "Wishlist", href: ROUTES.account.wishlist, icon: Heart },
  { label: "Akun saya", href: ROUTES.account.dashboard, icon: User },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  const close = () => setOpen(false);

  return (
    <>
      <IconButton
        label="Buka menu"
        aria-expanded={open}
        icon={<Menu aria-hidden className="size-5" strokeWidth={1.5} />}
        onClick={() => setOpen(true)}
        className="-ml-2"
      />
      <Drawer side="left" open={open} onClose={close} title="Menu">
        <nav aria-label="Navigasi utama">
          <ul className="flex flex-col">
            {PRIMARY_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block py-3 font-display text-h3 text-brand-cocoa"
                        : "block py-3 font-display text-h3 text-text-primary"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Button
          variant="ai"
          fullWidth
          className="mt-6"
          leadingIcon={<Sparkles aria-hidden className="size-4" />}
          onClick={() => {
            close();
            openAIPanel();
          }}
        >
          Tanya CNS Beauty AI
        </Button>

        <ul className="mt-6 flex flex-col border-t border-border pt-4">
          {SECONDARY.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link href={href} onClick={close} className="flex items-center gap-3 py-3 text-body text-text-secondary">
                <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}
