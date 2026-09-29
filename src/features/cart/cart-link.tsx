"use client";

import { ShoppingBag } from "lucide-react";

import { IconLink } from "@/components/ui/icon-button";
import { ROUTES } from "@/constants/routes";

import { useCartSummary } from "./cart-query";

/** Header cart icon. The count loads on the client so pages stay static. */
export function CartLink({ className }: { className?: string }) {
  const { data } = useCartSummary();
  const count = data?.count ?? 0;
  return (
    <IconLink
      href={ROUTES.cart}
      label={count > 0 ? `Keranjang, ${count} produk` : "Keranjang"}
      count={count}
      icon={<ShoppingBag aria-hidden className="size-5" strokeWidth={1.5} />}
      className={className}
    />
  );
}
