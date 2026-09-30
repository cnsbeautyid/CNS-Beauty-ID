import "server-only";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";

import { readCookieCart, writeCookieCart } from "./cookie";
import { cartFromRows, diffCartRows, EMPTY_CART, mergeCarts, type CartState } from "./model";

/**
 * The current visitor's cart: the httpOnly cookie for guests, the
 * carts/cart_items tables (RLS: own rows only) for signed-in users. The
 * guest cart is merged into the account cart at sign-in (mergeGuestCart).
 * Prices never live here; totals always come from quoteCart().
 */

type Db = Awaited<ReturnType<typeof createClient>>;

export class CartStoreError extends Error {
  constructor(cause: unknown) {
    super("Cart storage failed", { cause });
    this.name = "CartStoreError";
  }
}

async function accountContext(): Promise<{ db: Db; userId: string } | null> {
  if (!getSupabasePublicConfig()) return null;
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  if (error || !data || typeof data.claims.sub !== "string") return null;
  return { db, userId: data.claims.sub };
}

async function loadAccountCart(db: Db, userId: string) {
  const { data, error } = await db
    .from("carts")
    .select("id, coupon_code, cart_items(id, product_id, variant_id, quantity, created_at)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new CartStoreError(error);
  const rows = [...(data?.cart_items ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { id: data?.id ?? null, rows, cart: cartFromRows(rows, data?.coupon_code ?? null) };
}

async function saveAccountCart(db: Db, userId: string, cart: CartState): Promise<void> {
  const stored = await loadAccountCart(db, userId);
  let cartId = stored.id;
  if (!cartId) {
    if (cart.items.length === 0) return;
    const { data, error } = await db.from("carts").insert({ user_id: userId, coupon_code: cart.coupon ?? null }).select("id").single();
    if (error) throw new CartStoreError(error);
    cartId = data.id;
  } else if ((stored.cart.coupon ?? null) !== (cart.coupon ?? null)) {
    const { error } = await db.from("carts").update({ coupon_code: cart.coupon ?? null }).eq("id", cartId);
    if (error) throw new CartStoreError(error);
  }

  const diff = diffCartRows(stored.rows, cart);
  if (diff.deleteIds.length > 0) {
    const { error } = await db.from("cart_items").delete().in("id", diff.deleteIds);
    if (error) throw new CartStoreError(error);
  }
  for (const update of diff.updates) {
    const { error } = await db.from("cart_items").update({ quantity: update.quantity }).eq("id", update.id);
    if (error) throw new CartStoreError(error);
  }
  if (diff.inserts.length > 0) {
    const { error } = await db.from("cart_items").insert(diff.inserts.map((row) => ({ ...row, cart_id: cartId, added_from: "web" })));
    if (error) throw new CartStoreError(error);
  }
}

/** Throws CartStoreError if the account cart can't be read (never guesses). */
export async function readCart(): Promise<CartState> {
  const account = await accountContext();
  if (!account) return readCookieCart();
  return (await loadAccountCart(account.db, account.userId)).cart;
}

/** Server Actions and Route Handlers only. Throws CartStoreError on failure. */
export async function writeCart(cart: CartState): Promise<void> {
  const account = await accountContext();
  if (!account) return writeCookieCart(cart);
  await saveAccountCart(account.db, account.userId, cart);
}

/**
 * Right after sign-in: moves the guest cookie cart into the account cart.
 * Takes the signed-in client from the auth call, whose session is already
 * in memory. Never fails the sign-in; on error the guest cart is kept.
 */
export async function mergeGuestCart(db: Db, userId: string): Promise<void> {
  const guest = await readCookieCart();
  if (guest.items.length === 0) return;
  try {
    const account = await loadAccountCart(db, userId);
    await saveAccountCart(db, userId, mergeCarts(account.cart, guest));
    await writeCookieCart(EMPTY_CART);
  } catch (error) {
    console.error("[cart] merging the guest cart failed", error);
  }
}
