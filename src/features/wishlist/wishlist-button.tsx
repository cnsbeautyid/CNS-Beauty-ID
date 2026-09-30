"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

import { toggleWishlistAction } from "./actions";

export const WISHLIST_KEY = ["wishlist"] as const;

type WishlistSummary = { signedIn: boolean; productIds: string[] };

async function fetchWishlist(): Promise<WishlistSummary> {
  const response = await fetch("/api/wishlist", { cache: "no-store" });
  if (!response.ok) throw new Error(`wishlist ${response.status}`);
  return response.json() as Promise<WishlistSummary>;
}

/** Heart toggle for product pages. Guests are sent to sign in first. */
export function WishlistButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const { data } = useQuery({ queryKey: WISHLIST_KEY, queryFn: fetchWishlist });
  const saved = data?.productIds.includes(productId) ?? false;

  const toggle = () =>
    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (!result.ok) {
        if (result.code === "unauthenticated") {
          router.push(`${ROUTES.signIn}?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setMessage(result.message);
        return;
      }
      queryClient.setQueryData<WishlistSummary>(WISHLIST_KEY, (current) => ({
        signedIn: true,
        productIds: result.saved
          ? [...(current?.productIds ?? []), productId]
          : (current?.productIds ?? []).filter((id) => id !== productId),
      }));
      setMessage(result.saved ? "Disimpan ke wishlist." : "Dihapus dari wishlist.");
    });

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        fullWidth
        loading={pending}
        onClick={toggle}
        leadingIcon={<Heart aria-hidden className={saved ? "size-4 fill-current text-brand-rose-gold" : "size-4"} />}
      >
        {saved ? "Tersimpan di wishlist" : "Simpan ke wishlist"}
        <span className="sr-only"> {productName}</span>
      </Button>
      <p role="status" className="sr-only">
        {message}
      </p>
    </div>
  );
}
