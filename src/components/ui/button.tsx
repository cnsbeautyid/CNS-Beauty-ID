import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "ai" | "inverse" | "inverse-outline";
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-brand-cocoa-dark",
  brand: "bg-brand-cocoa text-on-primary hover:bg-brand-cocoa-dark",
  secondary: "border border-primary text-text-primary hover:bg-secondary",
  ghost: "text-text-primary hover:bg-secondary",
  ai: "border border-ai-accent bg-ai-surface text-text-primary hover:bg-secondary",
  // For dark surfaces (e.g. bg-brand-cocoa-dark).
  inverse: "bg-background text-text-primary hover:bg-secondary",
  "inverse-outline": "border border-on-primary text-on-primary hover:bg-on-primary/10",
};

// md/lg meet the 44px touch target; sm is for dense, non-primary contexts.
// Minimum heights (not fixed) so a label that can't fit on a narrow screen
// wraps instead of pushing the layout sideways (WCAG 1.4.10). Single-line
// labels keep exactly these heights.
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 py-1 text-body-s",
  md: "min-h-11 px-6 py-2 text-body-s",
  lg: "min-h-13 px-8 py-2 text-body",
};

export function buttonClassName({ variant = "primary", size = "md", fullWidth }: StyleProps = {}) {
  return cn(
    "inline-flex max-w-full items-center justify-center gap-2 rounded-md text-center font-medium tracking-wide",
    "transition-colors duration-(--duration-base) ease-standard",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
  );
}

type ContentProps = { leadingIcon?: ReactNode; trailingIcon?: ReactNode };

export type ButtonProps = ComponentProps<"button"> &
  StyleProps &
  ContentProps & {
    /** Shows a spinner and blocks interaction while an action is pending. */
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClassName({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps & ContentProps;

export function ButtonLink({
  variant,
  size,
  fullWidth,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClassName({ variant, size, fullWidth }), className)} {...props}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}
