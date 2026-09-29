"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export const CART_SUMMARY_KEY = ["cart", "summary"] as const;

type CartSummary = { count: number };

export function useCartSummary() {
  return useQuery({
    queryKey: CART_SUMMARY_KEY,
    queryFn: async (): Promise<CartSummary> => {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (!response.ok) throw new Error("cart summary unavailable");
      return (await response.json()) as CartSummary;
    },
  });
}

/** Updates the header badge after a cart Server Action returns the new count. */
export function useSetCartCount() {
  const client = useQueryClient();
  return (count: number) => client.setQueryData<CartSummary>(CART_SUMMARY_KEY, { count });
}
