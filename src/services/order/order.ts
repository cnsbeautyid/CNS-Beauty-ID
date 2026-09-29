import "server-only";

import { createClient } from "@/lib/supabase/server";

export const PAYMENT_PROOF_BUCKET = "payment-proofs";

const ORDER_COLUMNS = `
  id, order_number, status, created_at, paid_at,
  shipping_recipient, shipping_phone, shipping_address, shipping_district,
  shipping_city, shipping_province, shipping_postal_code, shipping_courier, tracking_number,
  subtotal, discount_total, points_discount, shipping_total, total, coupon_code, notes,
  order_items(id, product_name, variant_name, quantity, unit_price, line_total),
  order_status_history(status, note, created_at),
  payments(provider, method, status, amount, expires_at)
` as const;

export type OwnOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  shipping: {
    recipient: string;
    phone: string;
    address: string;
    district: string;
    city: string;
    province: string;
    postalCode: string;
    courier: string | null;
    trackingNumber: string | null;
  };
  items: { id: string; name: string; variantName: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  couponCode: string | null;
  notes: string | null;
  history: { status: string; note: string | null; createdAt: string }[];
  payment: { method: string | null; status: string; expiresAt: string | null } | null;
  proofCount: number;
};

export type OwnOrderResult = { status: "ok"; order: OwnOrder } | { status: "not_found" } | { status: "error" };

/**
 * An order of the signed-in user. Runs as that user, so RLS
 * (own_select_orders & co.) is the authorization; another customer's order
 * number simply isn't found.
 */
export async function getOwnOrder(orderNumber: string, userId: string): Promise<OwnOrderResult> {
  try {
    const db = await createClient();
    const { data, error } = await db.from("orders").select(ORDER_COLUMNS).eq("order_number", orderNumber).maybeSingle();
    if (error) throw error;
    if (!data) return { status: "not_found" };

    const { data: proofs, error: proofError } = await db.storage.from(PAYMENT_PROOF_BUCKET).list(`${userId}/${data.id}`, { limit: 20 });
    if (proofError) console.error("[order] listing payment proofs failed", proofError);

    const payment = [...data.payments].sort((a, b) => (b.expires_at ?? "").localeCompare(a.expires_at ?? ""))[0];
    return {
      status: "ok",
      order: {
        id: data.id,
        orderNumber: data.order_number,
        status: data.status,
        createdAt: data.created_at,
        paidAt: data.paid_at,
        shipping: {
          recipient: data.shipping_recipient,
          phone: data.shipping_phone,
          address: data.shipping_address,
          district: data.shipping_district,
          city: data.shipping_city,
          province: data.shipping_province,
          postalCode: data.shipping_postal_code,
          courier: data.shipping_courier,
          trackingNumber: data.tracking_number,
        },
        items: data.order_items.map((item) => ({
          id: item.id,
          name: item.product_name,
          variantName: item.variant_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.line_total,
        })),
        subtotal: data.subtotal,
        discountTotal: data.discount_total + data.points_discount,
        shippingTotal: data.shipping_total,
        total: data.total,
        couponCode: data.coupon_code,
        notes: data.notes,
        history: [...data.order_status_history]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((entry) => ({ status: entry.status, note: entry.note, createdAt: entry.created_at })),
        payment: payment ? { method: payment.method, status: payment.status, expiresAt: payment.expires_at } : null,
        proofCount: (proofs ?? []).filter((file) => file.name && !file.name.startsWith(".")).length,
      },
    };
  } catch (error) {
    console.error("[order] getOwnOrder failed", error);
    return { status: "error" };
  }
}
