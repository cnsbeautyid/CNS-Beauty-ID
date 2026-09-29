import { z } from "zod";

/**
 * Guest cart kept in an httpOnly cookie. It stores only WHAT the customer
 * wants (product, variant, quantity), never prices: every total comes from
 * the backend quote (public.quote_cart). Database carts (carts/cart_items)
 * require a signed-in user and take over after login (Phase 8).
 */

export const MAX_CART_LINES = 20;
export const MAX_QUANTITY = 99;

const lineSchema = z.object({
  p: z.uuid(),
  v: z.uuid().optional(),
  q: z.number().int().min(1).max(MAX_QUANTITY),
});

const cartSchema = z.object({
  v: z.literal(1),
  items: z.array(lineSchema).max(MAX_CART_LINES),
  coupon: z.string().max(40).optional(),
});

export type CartLine = z.infer<typeof lineSchema>;
export type CartState = z.infer<typeof cartSchema>;

export const EMPTY_CART: CartState = { v: 1, items: [] };

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{2,40}$/, "Kode kupon tidak valid.");

export const lineKey = (line: Pick<CartLine, "p" | "v">) => (line.v ? `${line.p}:${line.v}` : line.p);

/** Tampered or outdated cookies become an empty cart instead of an error. */
export function parseCart(raw: string | undefined): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return EMPTY_CART;
    // Merge duplicate lines that a hand-edited cookie might contain.
    const merged = new Map<string, CartLine>();
    for (const line of parsed.data.items) {
      const existing = merged.get(lineKey(line));
      merged.set(lineKey(line), existing ? { ...line, q: Math.min(MAX_QUANTITY, existing.q + line.q) } : line);
    }
    return { ...parsed.data, items: [...merged.values()] };
  } catch {
    return EMPTY_CART;
  }
}

export function serializeCart(cart: CartState): string {
  return JSON.stringify(cart);
}

export type CartChange = { cart: CartState } | { error: "cart_full" };

export function addItem(cart: CartState, productId: string, variantId: string | undefined, quantity: number): CartChange {
  const key = lineKey({ p: productId, v: variantId });
  const existing = cart.items.find((line) => lineKey(line) === key);
  if (existing) {
    return {
      cart: {
        ...cart,
        items: cart.items.map((line) =>
          lineKey(line) === key ? { ...line, q: Math.min(MAX_QUANTITY, line.q + quantity) } : line,
        ),
      },
    };
  }
  if (cart.items.length >= MAX_CART_LINES) return { error: "cart_full" };
  const line: CartLine = variantId ? { p: productId, v: variantId, q: Math.min(MAX_QUANTITY, quantity) } : { p: productId, q: Math.min(MAX_QUANTITY, quantity) };
  return { cart: { ...cart, items: [...cart.items, line] } };
}

export function setQuantity(cart: CartState, key: string, quantity: number): CartState {
  const q = Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(quantity)));
  return { ...cart, items: cart.items.map((line) => (lineKey(line) === key ? { ...line, q } : line)) };
}

export function removeItem(cart: CartState, key: string): CartState {
  const items = cart.items.filter((line) => lineKey(line) !== key);
  // An empty cart has nothing for a coupon to apply to.
  return items.length === 0 ? EMPTY_CART : { ...cart, items };
}

export function setCoupon(cart: CartState, code: string | undefined): CartState {
  const withoutCoupon: CartState = { v: cart.v, items: cart.items };
  return code ? { ...withoutCoupon, coupon: code } : withoutCoupon;
}

export function itemCount(cart: CartState): number {
  return cart.items.reduce((total, line) => total + line.q, 0);
}
