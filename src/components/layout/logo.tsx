import Link from "next/link";

import { BRAND } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";

type LogoProps = {
  size?: "md" | "lg";
  showFounder?: boolean;
  className?: string;
};

/**
 * Official CNS monogram (assets/CNS_logo_*.png, tinted brand cocoa via
 * `.cns-logo-mark`) plus the wordmark. At header size the mark's fine lines
 * don't read on their own, so the name is always set beside it.
 */
export function Logo({ size = "md", showFounder = false, className }: LogoProps) {
  const large = size === "lg";
  return (
    <Link
      href={ROUTES.home}
      aria-label={`${BRAND.legalName}, ke beranda`}
      className={cn("inline-flex items-center gap-3 text-brand-cocoa-dark", className)}
    >
      <span aria-hidden className={cn("cns-logo-mark", large ? "h-20" : "h-11 desktop:h-12")} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display font-semibold tracking-wider", large ? "text-h3" : "text-h4")}>
          {BRAND.name}
        </span>
        <span className="mt-1 text-caption tracking-eyebrow uppercase">Skincare</span>
        {showFounder && <span className="mt-1.5 font-display text-body-s italic">{BRAND.founderLine}</span>}
      </span>
    </Link>
  );
}
