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

// ---- Database carts (signed-in users) ------------------------------------

export type CartRow = { id: string; product_id: string; variant_id: string | null; quantity: number };

const clampQuantity = (quantity: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(quantity)));

/** carts/cart_items rows → CartState, merging duplicate lines and capping like the cookie cart. */
export function cartFromRows(rows: readonly Omit<CartRow, "id">[], couponCode: string | null): CartState {
  const cart = rows.reduce<CartState>((current, row) => {
    const change = addItem(current, row.product_id, row.variant_id ?? undefined, clampQuantity(row.quantity));
    return "cart" in change ? change.cart : current;
  }, EMPTY_CART);
  const coupon = couponCodeSchema.safeParse(couponCode ?? "");
  return cart.items.length > 0 && coupon.success ? setCoupon(cart, coupon.data) : cart;
}

/** Guest cart merged into the account cart at sign-in. A guest coupon wins. */
export function mergeCarts(account: CartState, guest: CartState): CartState {
  const items = guest.items.reduce<CartState>((current, line) => {
    const change = addItem(current, line.p, line.v, line.q);
    return "cart" in change ? change.cart : current;
  }, account);
  return setCoupon(items, guest.coupon ?? account.coupon);
}

export type CartRowDiff = {
  deleteIds: string[];
  updates: { id: string; quantity: number }[];
  inserts: { product_id: string; variant_id: string | null; quantity: number }[];
};

/** Minimal row changes that turn the stored cart_items into `desired`. */
export function diffCartRows(existing: readonly CartRow[], desired: CartState): CartRowDiff {
  const wanted = new Map(desired.items.map((line) => [lineKey(line), line]));
  const kept = new Set<string>();
  const diff: CartRowDiff = { deleteIds: [], updates: [], inserts: [] };

  for (const row of existing) {
    const key = lineKey({ p: row.product_id, v: row.variant_id ?? undefined });
    const line = wanted.get(key);
    if (!line || kept.has(key)) {
      diff.deleteIds.push(row.id);
      continue;
    }
    kept.add(key);
    if (row.quantity !== line.q) diff.updates.push({ id: row.id, quantity: line.q });
  }
  for (const [key, line] of wanted) {
    if (!kept.has(key)) diff.inserts.push({ product_id: line.p, variant_id: line.v ?? null, quantity: line.q });
  }
  return diff;
}
