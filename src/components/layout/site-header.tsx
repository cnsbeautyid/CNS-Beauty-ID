import { Heart, Search, User } from "lucide-react";

import { AIHeaderButton } from "@/components/ai/ai-header-button";
import { IconLink } from "@/components/ui/icon-button";
import { PRIMARY_NAV } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { CartLink } from "@/features/cart/cart-link";

import { Container } from "./container";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

const ICON = { className: "size-5", strokeWidth: 1.5, "aria-hidden": true } as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <Container className="flex h-16 items-center gap-4 desktop:h-20">
        <div className="flex flex-1 items-center desktop:hidden">
          <MobileNav />
        </div>

        <Logo className="shrink-0" />

        <nav aria-label="Navigasi utama" className="hidden flex-1 justify-center desktop:flex">
          <NavLinks items={PRIMARY_NAV} />
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1 desktop:flex-none">
          {/* Display toggles live on wrappers, never on components that set their own display. */}
          <div className="hidden items-center gap-1 desktop:flex">
            <IconLink href={ROUTES.products} label="Cari produk" icon={<Search {...ICON} />} />
            <AIHeaderButton className="mx-2" />
            <IconLink href={ROUTES.account.wishlist} label="Wishlist" icon={<Heart {...ICON} />} />
            <IconLink href={ROUTES.account.dashboard} label="Akun saya" icon={<User {...ICON} />} />
          </div>
          <CartLink className="-mr-2 desktop:mr-0" />
        </div>
      </Container>
    </header>
  );
}
