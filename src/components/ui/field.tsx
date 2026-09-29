import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Shared props for labelled form controls. `id` is required to wire ARIA. */
export type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function controlClassName(hasError: boolean) {
  return cn(
    "w-full rounded-md border bg-background px-4 text-body text-text-primary placeholder:text-text-secondary",
    "transition-colors duration-(--duration-fast) ease-standard",
    "hover:border-text-secondary focus-visible:border-primary",
    "disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-secondary",
    hasError ? "border-error" : "border-border",
  );
}

export function FieldLabel({
  htmlFor,
  required,
  hidden,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("text-body-s font-medium text-text-primary", hidden && "sr-only")}>
      {children}
      {required && (
        <span aria-hidden className="text-error">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={`${id}-hint`} className="text-caption text-text-secondary">
      {children}
    </p>
  );
}

/** Error text always has an icon so meaning never relies on color alone. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={`${id}-error`} className="flex items-center gap-1 text-caption text-error">
      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  hideLabel,
  required,
  children,
}: FieldProps & { required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} required={required} hidden={hideLabel}>
        {label}
      </FieldLabel>
      {children}
      {hint && <FieldHint id={id}>{hint}</FieldHint>}
      {error && <FieldError id={id}>{error}</FieldError>}
    </div>
  );
}
