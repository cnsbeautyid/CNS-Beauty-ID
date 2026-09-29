import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type IconButtonStyle = { variant?: "ghost" | "outline" | "solid"; size?: "sm" | "md" };

type IconContent = {
  /** Accessible name. Required because the control has no visible text. */
  label: string;
  icon: ReactNode;
  /** Small counter badge (e.g. cart items). Include the count in `label` too. */
  count?: number;
};

function iconButtonClassName({ variant = "ghost", size = "md" }: IconButtonStyle) {
  return cn(
    "relative inline-flex shrink-0 items-center justify-center rounded-pill",
    "transition-colors duration-(--duration-base) ease-standard",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "solid"
      ? "bg-primary text-on-primary hover:bg-brand-cocoa-dark"
      : "text-text-primary hover:bg-secondary",
    variant === "outline" && "border border-border",
    size === "md" ? "size-11" : "size-9",
  );
}

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      aria-hidden
      className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-pill bg-brand-cocoa px-1 text-caption leading-4 text-on-primary"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export type IconButtonProps = Omit<ComponentProps<"button">, "children"> & IconButtonStyle & IconContent;

export function IconButton({ label, icon, count, variant, size, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(iconButtonClassName({ variant, size }), className)}
      {...props}
    >
      {icon}
      <CountBadge count={count} />
    </button>
  );
}

export type IconLinkProps = Omit<ComponentProps<typeof Link>, "children"> & IconButtonStyle & IconContent;

export function IconLink({ label, icon, count, variant, size, className, ...props }: IconLinkProps) {
  return (
    <Link aria-label={label} className={cn(iconButtonClassName({ variant, size }), className)} {...props}>
      {icon}
      <CountBadge count={count} />
    </Link>
  );
}
