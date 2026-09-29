import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { controlClassName, describedBy, FieldShell, type FieldProps } from "./field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<ComponentProps<"select">, "id" | "children"> &
  FieldProps & {
    options: readonly SelectOption[];
    /** Renders an empty first option, e.g. "Pilih jenis kulit". */
    placeholder?: string;
  };

// Native <select>: best keyboard, screen-reader and mobile picker support.
export function Select({
  id,
  label,
  hint,
  error,
  hideLabel,
  options,
  placeholder,
  className,
  required,
  ...props
}: SelectProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} required={required}>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(controlClassName(Boolean(error)), "h-11 appearance-none pr-10", className)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
        />
      </div>
    </FieldShell>
  );
}
