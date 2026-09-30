"use client";

import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useSetCartCount } from "@/features/cart/cart-query";
import { addRoutineToCartAction } from "@/features/skin-quiz/actions";

import { removeRoutineItemAction } from "./actions";

export function RemoveRoutineItemButton({ itemId, label }: { itemId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeRoutineItemAction(itemId);
          if (result.ok) router.refresh();
        })
      }
      className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-50"
    >
      <X aria-hidden className="size-4" />
      <span className="sr-only">Hapus {label} dari rutinitas</span>
    </button>
  );
}

/** Adds every published, in-stock product of the routine; the cart quote re-checks. */
export function RoutineCartButton({ productIds }: { productIds: string[] }) {
  const setCartCount = useSetCartCount();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const disabled = productIds.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() =>
          startTransition(async () => {
            const result = await addRoutineToCartAction(productIds);
            if (!result.ok) return setMessage({ ok: false, text: result.message });
            setCartCount(result.count);
            setMessage({ ok: true, text: `${result.added} produk ditambahkan ke keranjang.` });
          })
        }
        loading={pending}
        disabled={disabled}
        leadingIcon={<ShoppingBag aria-hidden className="size-4" />}
      >
        {disabled ? "Produk rutinitas sedang tidak tersedia" : "Tambahkan rutinitas ke keranjang"}
      </Button>
      <p role="status" className={message?.ok === false ? "text-body-s text-error" : "text-body-s text-success"}>
        {message?.text}{" "}
        {message?.ok && (
          <Link href={ROUTES.cart} className="font-medium text-text-primary underline underline-offset-4">
            Lihat keranjang
          </Link>
        )}
      </p>
    </div>
  );
}
