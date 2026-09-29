import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { controlClassName, describedBy, FieldShell, type FieldProps } from "./field";

export type InputProps = Omit<ComponentProps<"input">, "id"> & FieldProps;

export function Input({ id, label, hint, error, hideLabel, className, required, ...props }: InputProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClassName(Boolean(error)), "h-11", className)}
        {...props}
      />
    </FieldShell>
  );
}
