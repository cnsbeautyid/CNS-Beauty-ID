"use client";

import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toggleWishlistAction } from "./actions";
import { WISHLIST_KEY } from "./wishlist-button";

export function RemoveFromWishlistButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWishlistAction(productId);
          if (result.ok) {
            await queryClient.invalidateQueries({ queryKey: WISHLIST_KEY });
            router.refresh();
          }
        })
      }
      className="inline-flex min-h-11 items-center gap-1 text-body-s font-medium text-text-primary underline underline-offset-4 disabled:opacity-50"
    >
      <X aria-hidden className="size-4" />
      Hapus<span className="sr-only"> {productName} dari wishlist</span>
    </button>
  );
}
