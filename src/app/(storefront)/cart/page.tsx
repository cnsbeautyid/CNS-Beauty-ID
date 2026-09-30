import type { Metadata } from "next";

import { CartView } from "@/features/cart/cart-view";
import { getSessionUserId } from "@/lib/auth/session";
import { getProductSummaries } from "@/services/catalog/products";
import { EMPTY_CART } from "@/services/cart/model";
import { CartStoreError, readCart } from "@/services/cart/store";
import { quoteCart } from "@/services/cart/quote";
import { getPublicContact } from "@/services/content/contact";

export const metadata: Metadata = {
  title: "Keranjang",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  let cart;
  try {
    cart = await readCart();
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    // Never show a failed read as an empty cart.
    return <CartView cart={EMPTY_CART} result={{ status: "error" }} products={new Map()} />;
  }
  const [result, products, contact] = await Promise.all([
    getSessionUserId().then((userId) => quoteCart(cart, userId)),
    getProductSummaries(cart.items.map((item) => item.p)),
    getPublicContact(),
  ]);

  return <CartView cart={cart} result={result} products={products} whatsapp={contact?.whatsapp} />;
}
