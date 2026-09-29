import "server-only";

import { cookies } from "next/headers";

import { parseCart, serializeCart, type CartState } from "./model";

export const CART_COOKIE = "cns_cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function readCart(): Promise<CartState> {
  const store = await cookies();
  return parseCart(store.get(CART_COOKIE)?.value);
}

/** Server Actions and Route Handlers only (Server Components cannot set cookies). */
export async function writeCart(cart: CartState): Promise<void> {
  const store = await cookies();
  if (cart.items.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serializeCart(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}
