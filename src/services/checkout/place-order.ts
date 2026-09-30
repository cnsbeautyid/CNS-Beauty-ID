import "server-only";

import { z } from "zod";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CartState } from "@/services/cart/model";
import { quoteErrorSchema, type QuoteError } from "@/services/cart/quote-schema";

import { BANK_TRANSFER_METHOD, MANUAL_PROVIDER, paymentDeadline } from "./payment";
import type { ShippingDetails } from "./schema";

const resultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), order_id: z.uuid(), order_number: z.string().min(1), total: z.number().int().nonnegative() }),
  z.object({ ok: z.literal(false), errors: z.array(quoteErrorSchema) }),
]);

export type PlaceOrderRequest = {
  cart: CartState;
  /** From getSessionUser(), never from the request. */
  userId: string;
  customer: { name: string; email: string; phone: string };
  shipping: ShippingDetails;
  notes?: string;
  expiryHours: number;
  /** Loyalty points to redeem; place_order debits them in the same transaction. */
  points?: number;
};

export type PlaceOrderResult =
  | { status: "ok"; orderId: string; orderNumber: string; total: number }
  | { status: "rejected"; errors: QuoteError[] }
  | { status: "inventory" }
  | { status: "unavailable" }
  | { status: "error" };

/**
 * Creates the order through public.place_order, which re-prices the cart,
 * reserves stock atomically and records coupon usage. Then opens a pending
 * manual-transfer payment. EXECUTE on place_order is service_role only.
 */
export async function placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
  if (!getSupabasePublicConfig() || !getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return { status: "unavailable" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("place_order", {
    p_items: request.cart.items.map((line) => ({ product_id: line.p, variant_id: line.v ?? null, quantity: line.q })),
    p_customer: { name: request.customer.name, email: request.customer.email, phone: request.customer.phone, whatsapp: request.customer.phone },
    p_shipping: {
      recipient_name: request.shipping.recipientName,
      phone: request.shipping.phone,
      address_line: request.shipping.addressLine,
      district: request.shipping.district,
      city: request.shipping.city,
      province: request.shipping.province,
      postal_code: request.shipping.postalCode,
    },
    p_user_id: request.userId,
    p_coupon_code: request.cart.coupon,
    p_points: request.points ?? 0,
    p_source: "web",
    p_notes: request.notes,
  });

  if (error) {
    // Stock reservation raises P0001 "insufficient_stock:<product>" when another
    // order took the last units between quote and placement.
    if (error.code === "P0001" && error.message.startsWith("insufficient_stock")) return { status: "inventory" };
    console.error("[checkout] place_order failed", error);
    return { status: "error" };
  }

  const parsed = resultSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[checkout] place_order returned an unexpected shape");
    return { status: "error" };
  }
  if (!parsed.data.ok) return { status: "rejected", errors: parsed.data.errors };

  const { order_id: orderId, order_number: orderNumber, total } = parsed.data;
  const { error: paymentError } = await admin.from("payments").insert({
    order_id: orderId,
    provider: MANUAL_PROVIDER,
    method: BANK_TRANSFER_METHOD,
    amount: total,
    status: "pending",
    expires_at: paymentDeadline(new Date(), request.expiryHours).toISOString(),
  });
  // The order is already placed; expiry works from orders.created_at, so a
  // missing payment row is logged rather than failing the checkout.
  if (paymentError) console.error("[checkout] payment row insert failed", { orderId, paymentError });

  return { status: "ok", orderId, orderNumber, total };
}
