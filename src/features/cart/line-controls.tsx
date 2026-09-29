"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { MAX_QUANTITY } from "@/services/cart/model";

import { removeItemAction, updateQuantityAction } from "./actions";
import { useSetCartCount } from "./cart-query";

/** − / + stepper. The server action re-renders the cart with a fresh quote. */
export function QuantityControl({ lineKey, quantity, productName }: { lineKey: string; quantity: number; productName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const setCartCount = useSetCartCount();

  const change = (next: number) =>
    startTransition(async () => {
      const response = await updateQuantityAction({ key: lineKey, quantity: next });
      if (response.ok) setCartCount(response.count);
      setError(response.ok ? null : response.message);
    });

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-label={`Jumlah ${productName}`} className="inline-flex items-center rounded-pill border border-border">
        <IconButton
          size="sm"
          label="Kurangi jumlah"
          disabled={pending || quantity <= 1}
          onClick={() => change(quantity - 1)}
          icon={<Minus aria-hidden className="size-4" />}
        />
        <span aria-live="polite" className="min-w-8 text-center text-body-s font-medium tabular-nums">
          {quantity}
        </span>
        <IconButton
          size="sm"
          label="Tambah jumlah"
          disabled={pending || quantity >= MAX_QUANTITY}
          onClick={() => change(quantity + 1)}
          icon={<Plus aria-hidden className="size-4" />}
        />
      </div>
      {error && (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function RemoveLineButton({ lineKey, productName }: { lineKey: string; productName: string }) {
  const [pending, startTransition] = useTransition();
  const setCartCount = useSetCartCount();
  return (
    <IconButton
      size="sm"
      label={`Hapus ${productName} dari keranjang`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const response = await removeItemAction({ key: lineKey });
          if (response.ok) setCartCount(response.count);
        })
      }
      icon={<Trash2 aria-hidden className="size-4" strokeWidth={1.5} />}
    />
  );
}
