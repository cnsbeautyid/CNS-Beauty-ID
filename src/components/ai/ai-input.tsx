"use client";

import { SendHorizontal } from "lucide-react";
import { useId, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";

type AIInputProps = {
  onSubmit: (message: string) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

export function AIInput({ onSubmit, value: controlledValue, onValueChange, disabled }: AIInputProps) {
  const id = useId();
  const [localValue, setLocalValue] = useState("");
  const value = controlledValue ?? localValue;
  const setValue = onValueChange ?? setLocalValue;
  const trimmed = value.trim();

  return (
    <form
      className="flex items-center gap-2 rounded-pill border border-border bg-background py-1 pr-1 pl-4 focus-within:border-primary"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmed || disabled) return;
        onSubmit(trimmed);
        setValue("");
      }}
    >
      <label htmlFor={id} className="sr-only">
        Tulis pertanyaan untuk CNS Beauty AI
      </label>
      <input
        id={id}
        autoFocus
        autoComplete="off"
        maxLength={1000}
        placeholder="Tanyakan kebutuhan kulitmu…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 flex-1 bg-transparent text-body-s text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
      />
      <IconButton
        type="submit"
        size="sm"
        variant="solid"
        label="Kirim pesan"
        disabled={!trimmed || disabled}
        icon={<SendHorizontal aria-hidden className="size-4" />}
      />
    </form>
  );
}
