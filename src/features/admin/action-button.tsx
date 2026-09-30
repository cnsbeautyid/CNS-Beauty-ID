"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button, type ButtonVariant } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { AdminActionResult } from "./actions";

type ActionButtonProps<P extends Record<string, unknown>> = {
  action: (payload: P) => Promise<AdminActionResult>;
  payload: P;
  label: string;
  /** Shown on the confirm step; omit to run immediately. */
  confirmLabel?: string;
  /** Adds a note field on the confirm step, sent as `note`. */
  note?: { label: string; required?: boolean };
  variant?: ButtonVariant;
};

/** A server action behind a button, with an optional confirm step and note. The server re-checks everything. */
export function ActionButton<P extends Record<string, unknown>>({ action, payload, label, confirmLabel, note, variant = "secondary" }: ActionButtonProps<P>) {
  const router = useRouter();
  const noteId = useId();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const run = () =>
    startTransition(async () => {
      const outcome = await action(note ? { ...payload, note: text } : payload);
      setResult(outcome);
      if (outcome.ok) {
        setConfirming(false);
        setText("");
        router.refresh();
      }
    });

  const needsConfirm = Boolean(confirmLabel || note);

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-col gap-3">
          {note && (
            <Textarea
              id={noteId}
              label={note.label}
              rows={2}
              required={note.required}
              value={text}
              onChange={(event) => setText(event.target.value)}
              error={result?.fieldErrors?.note}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={variant === "secondary" ? "primary" : variant} onClick={run} loading={pending} disabled={note?.required && !text.trim()}>
              {confirmLabel ?? label}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant={variant} loading={pending} onClick={needsConfirm ? () => setConfirming(true) : run}>
          {label}
        </Button>
      )}
      <p role="status" className={result?.ok === false ? "text-caption text-error" : "text-caption text-success"}>
        {result?.message}
      </p>
    </div>
  );
}
