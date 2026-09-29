import type { Metadata } from "next";

import { CartView } from "@/features/cart/cart-view";
import { getSessionUserId } from "@/lib/auth/session";
import { getProductSummaries } from "@/services/catalog/products";
import { readCart } from "@/services/cart/cookie";
import { quoteCart } from "@/services/cart/quote";
import { getPublicContact } from "@/services/content/contact";

export const metadata: Metadata = {
  title: "Keranjang",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const cart = await readCart();
  const [result, products, contact] = await Promise.all([
    getSessionUserId().then((userId) => quoteCart(cart, userId)),
    getProductSummaries(cart.items.map((item) => item.p)),
    getPublicContact(),
  ]);

  return <CartView cart={cart} result={result} products={products} whatsapp={contact?.whatsapp} />;
}
