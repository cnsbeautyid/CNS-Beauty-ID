import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { controlClassName, describedBy, FieldShell, type FieldProps } from "./field";

export type TextareaProps = Omit<ComponentProps<"textarea">, "id"> & FieldProps;

export function Textarea({ id, label, hint, error, hideLabel, className, required, rows = 4, ...props }: TextareaProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClassName(Boolean(error)), "resize-y py-3", className)}
        {...props}
      />
    </FieldShell>
  );
}
