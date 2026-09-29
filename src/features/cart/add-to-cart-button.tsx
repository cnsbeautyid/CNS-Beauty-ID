"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, type ButtonSize } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

import { addToCartAction } from "./actions";
import { useSetCartCount } from "./cart-query";

type AddToCartButtonProps = {
  productId: string;
  available: boolean;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Hides the inline result message (e.g. in the compact mobile bar). */
  compact?: boolean;
};

export function AddToCartButton({ productId, available, size = "lg", fullWidth, compact = false }: AddToCartButtonProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const setCartCount = useSetCartCount();

  if (!available) {
    return (
      <Button size={size} fullWidth={fullWidth} disabled>
        Stok habis
      </Button>
    );
  }

  const add = () =>
    startTransition(async () => {
      const response = await addToCartAction({ productId, quantity: 1 });
      if (response.ok) setCartCount(response.count);
      setResult({ ok: response.ok, message: response.message ?? (response.ok ? "Ditambahkan ke keranjang." : "") });
    });

  return (
    <div className="flex flex-col gap-2">
      <Button size={size} fullWidth={fullWidth} loading={pending} onClick={add}>
        {pending ? "Menambahkan…" : "Tambah ke Keranjang"}
      </Button>
      <p role="status" className={compact ? "sr-only" : "min-h-5 text-body-s"}>
        {result && (
          <span className={result.ok ? "text-success" : "text-error"}>
            {result.message}{" "}
            {result.ok && (
              <Link href={ROUTES.cart} className="font-medium text-text-primary underline underline-offset-4">
                Lihat keranjang
              </Link>
            )}
          </span>
        )}
      </p>
    </div>
  );
}
