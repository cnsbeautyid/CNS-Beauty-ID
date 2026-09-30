import "server-only";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type { CartState } from "./model";
import { toCartQuote, type CartQuote } from "./quote-schema";

export type CartQuoteResult =
  | { status: "empty" }
  | { status: "ok"; quote: CartQuote }
  | { status: "unavailable" }
  | { status: "error" };

/**
 * Authoritative cart pricing via public.quote_cart (EXECUTE is granted to
 * service_role only, so this runs server-side with the secret key).
 * `userId` MUST come from getSessionUserId(), never from the request: the
 * function applies partner pricing and loyalty points for that user.
 * `points` is the number the customer asked to redeem; the quote reports how
 * many actually apply (pointsApplied).
 */
export async function quoteCart(cart: CartState, userId: string | null, points = 0): Promise<CartQuoteResult> {
  if (cart.items.length === 0) return { status: "empty" };
  if (!getSupabasePublicConfig() || !getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return { status: "unavailable" };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("quote_cart", {
      p_items: cart.items.map((line) => ({ product_id: line.p, variant_id: line.v ?? null, quantity: line.q })),
      p_user_id: userId ?? undefined,
      p_coupon_code: cart.coupon,
      // quote_cart caps points at the balance and max_redeem_percent; guests can't redeem.
      p_points: userId ? Math.max(0, Math.trunc(points)) : 0,
    });
    if (error) throw error;
    const quote = toCartQuote(data);
    if (!quote) {
      console.error("[cart] quote_cart returned an unexpected shape");
      return { status: "error" };
    }
    return { status: "ok", quote };
  } catch (error) {
    console.error("[cart] quoteCart failed", error);
    return { status: "error" };
  }
}
