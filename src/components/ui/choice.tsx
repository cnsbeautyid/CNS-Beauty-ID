import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { describedBy, FieldError, FieldHint } from "./field";

type ChoiceProps = Omit<ComponentProps<"input">, "id" | "type"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

const CONTROL = "mt-0.5 size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed";

export function Checkbox({ id, label, hint, error, className, ...props }: ChoiceProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={CONTROL}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-body text-text-primary">
          {label}
        </label>
      </div>
      {(hint || error) && (
        <div className="flex flex-col gap-1 pl-8">
          {hint && <FieldHint id={id}>{hint}</FieldHint>}
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      )}
    </div>
  );
}

export type RadioOption = { value: string; label: string; hint?: string; disabled?: boolean };

type RadioGroupProps = {
  name: string;
  legend: string;
  options: readonly RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
};

export function RadioGroup({ name, legend, options, value, defaultValue, onChange, error, required }: RadioGroupProps) {
  const errorId = `${name}-group`;
  return (
    <fieldset
      aria-describedby={error ? `${errorId}-error` : undefined}
      aria-invalid={error ? true : undefined}
      className="flex flex-col gap-3"
    >
      <legend className="mb-1 text-body-s font-medium text-text-primary">{legend}</legend>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <div key={option.value} className="flex flex-col gap-1">
            <div className="flex items-start gap-3">
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                required={required}
                disabled={option.disabled}
                checked={value === undefined ? undefined : value === option.value}
                defaultChecked={defaultValue === undefined ? undefined : defaultValue === option.value}
                onChange={onChange ? () => onChange(option.value) : undefined}
                aria-describedby={option.hint ? `${id}-hint` : undefined}
                className={CONTROL}
              />
              <label htmlFor={id} className="cursor-pointer text-body text-text-primary">
                {option.label}
              </label>
            </div>
            {option.hint && (
              <div className="pl-8">
                <FieldHint id={id}>{option.hint}</FieldHint>
              </div>
            )}
          </div>
        );
      })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
