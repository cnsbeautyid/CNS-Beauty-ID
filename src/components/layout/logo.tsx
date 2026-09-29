import Link from "next/link";

import { BRAND } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";

/**
 * Typographic wordmark. Swap the inner markup for the official SVG logo once
 * CNS Beauty provides it; every placement uses this component.
 */
type LogoProps = { className?: string; showFounder?: boolean; align?: "center" | "start" };

export function Logo({ className, showFounder = false, align = "center" }: LogoProps) {
  return (
    <Link
      href={ROUTES.home}
      aria-label={`${BRAND.legalName}, ke beranda`}
      className={cn(
        "inline-flex flex-col leading-none text-brand-cocoa-dark",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <span className="font-display text-h3 font-semibold tracking-widest">CNS</span>
      <span className="mt-1 text-caption tracking-eyebrow uppercase">{BRAND.descriptor}</span>
      {showFounder && <span className="mt-1 font-display text-body-s italic">{BRAND.founderLine}</span>}
    </Link>
  );
}
