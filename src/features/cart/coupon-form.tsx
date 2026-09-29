"use client";

import { X } from "lucide-react";
import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { applyCouponAction, removeCouponAction, type CouponFormState } from "./actions";

const INITIAL: CouponFormState = { status: "idle" };

/** Progressive enhancement: a plain form POST to the Server Action. */
export function CouponForm() {
  const [state, formAction, pending] = useActionState(applyCouponAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            id="coupon-code"
            name="code"
            label="Kode kupon"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            placeholder="Masukkan kode"
            error={state.status === "error" ? state.message : undefined}
          />
        </div>
        <Button type="submit" variant="secondary" loading={pending}>
          Pakai
        </Button>
      </div>
      {state.status === "success" && (
        <p role="status" className="text-caption text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function AppliedCoupon({ code, description }: { code: string; description: string | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2">
      <div className="text-body-s">
        <p className="font-medium text-text-primary">Kupon {code}</p>
        {description && <p className="text-caption text-text-secondary">{description}</p>}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await removeCouponAction()))}
        className="inline-flex min-h-9 items-center gap-1 text-caption font-medium text-text-primary underline underline-offset-4 disabled:opacity-50"
      >
        <X aria-hidden className="size-3.5" />
        Hapus kupon
      </button>
    </div>
  );
}
