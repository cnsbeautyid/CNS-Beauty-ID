import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BANK_TRANSFER_METHOD, MANUAL_PROVIDER } from "@/services/checkout/payment";
import { PAYMENT_PROOF_BUCKET } from "@/services/order/order";
import type { Database } from "@/types/database";

import { ADMIN_PAGE_SIZE, TRANSITION_TARGET } from "./model";

// Orders for staff. Reads run as the staff member (staff_select_orders & co.).
// Mutations go through the ledger functions or the service role, because
// mark_order_paid / release_order are service-role only and
// order_status_history has no staff insert policy; every caller has already
// verified the staff role server-side (authorizeStaff) and audits the action.

type OrderStatus = Database["public"]["Enums"]["order_status"];

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  email: string;
  total: number;
  createdAt: string;
  partnerType: string | null;
  isDropship: boolean;
};

export type AdminOrdersPage = { status: "ok"; orders: AdminOrderRow[]; page: number; pageCount: number; total: number } | { status: "error" };

export async function listAdminOrders(opts: { status?: OrderStatus; search?: string; page: number }): Promise<AdminOrdersPage> {
  const db = await createClient();
  const from = (opts.page - 1) * ADMIN_PAGE_SIZE;
  let query = db
    .from("orders")
    .select("id, order_number, status, customer_name, email, total, created_at, partner_type, is_dropship", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (opts.status) query = query.eq("status", opts.status);
  // sanitizeSearch() already reduced the term to letters, digits, @ . - and spaces.
  if (opts.search) query = query.or(`order_number.ilike.%${opts.search}%,email.ilike.%${opts.search}%,customer_name.ilike.%${opts.search}%`);
  const { data, error, count } = await query;
  if (error) {
    console.error("[admin] listAdminOrders failed", error);
    return { status: "error" };
  }
  const total = count ?? 0;
  return {
    status: "ok",
    total,
    page: opts.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    orders: (data ?? []).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      customerName: row.customer_name,
      email: row.email,
      total: row.total,
      createdAt: row.created_at,
      partnerType: row.partner_type,
      isDropship: row.is_dropship,
    })),
  };
}

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  source: string;
  createdAt: string;
  paidAt: string | null;
  userId: string | null;
  customer: { name: string; email: string; phone: string; whatsapp: string | null };
  shipping: { recipient: string; phone: string; address: string; district: string; city: string; province: string; postalCode: string; courier: string | null; trackingNumber: string | null };
  items: { id: string; name: string; variantName: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountTotal: number;
  pointsDiscount: number;
  shippingTotal: number;
  total: number;
  couponCode: string | null;
  notes: string | null;
  partnerType: string | null;
  partnerTierLevel: number | null;
  isDropship: boolean;
  aiAssisted: boolean;
  history: { status: string; note: string | null; createdAt: string }[];
  payments: { provider: string; method: string | null; status: string; amount: number; expiresAt: string | null }[];
  /** Short-lived signed URLs for the customer's payment proofs (private bucket, staff read policy). */
  proofs: { name: string; url: string }[];
};

export async function getAdminOrder(orderNumber: string): Promise<AdminOrder | null | undefined> {
  const db = await createClient();
  const { data, error } = await db
    .from("orders")
    .select(
      `id, order_number, status, source, created_at, paid_at, user_id, customer_name, email, phone, whatsapp,
       shipping_recipient, shipping_phone, shipping_address, shipping_district, shipping_city, shipping_province, shipping_postal_code,
       shipping_courier, tracking_number, subtotal, discount_total, points_discount, shipping_total, total, coupon_code, notes,
       partner_type, partner_tier_level, is_dropship, ai_conversation_id,
       order_items(id, product_name, variant_name, quantity, unit_price, line_total),
       order_status_history(status, note, created_at),
       payments(provider, method, status, amount, expires_at)`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) {
    console.error("[admin] getAdminOrder failed", error);
    return undefined;
  }
  if (!data) return null;

  let proofs: AdminOrder["proofs"] = [];
  if (data.user_id) {
    const folder = `${data.user_id}/${data.id}`;
    const { data: files, error: listError } = await db.storage.from(PAYMENT_PROOF_BUCKET).list(folder, { limit: 20 });
    if (listError) console.error("[admin] listing proofs failed", listError);
    const names = (files ?? []).map((file) => file.name).filter((name) => name && !name.startsWith("."));
    if (names.length > 0) {
      const { data: signed, error: signError } = await db.storage.from(PAYMENT_PROOF_BUCKET).createSignedUrls(
        names.map((name) => `${folder}/${name}`),
        600,
      );
      if (signError) console.error("[admin] signing proofs failed", signError);
      proofs = (signed ?? []).flatMap((entry, index) => (entry.signedUrl ? [{ name: names[index] ?? "bukti", url: entry.signedUrl }] : []));
    }
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    source: data.source,
    createdAt: data.created_at,
    paidAt: data.paid_at,
    userId: data.user_id,
    customer: { name: data.customer_name, email: data.email, phone: data.phone, whatsapp: data.whatsapp },
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
    discountTotal: data.discount_total,
    pointsDiscount: data.points_discount,
    shippingTotal: data.shipping_total,
    total: data.total,
    couponCode: data.coupon_code,
    notes: data.notes,
    partnerType: data.partner_type,
    partnerTierLevel: data.partner_tier_level,
    isDropship: data.is_dropship,
    aiAssisted: data.ai_conversation_id !== null,
    history: [...data.order_status_history]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((entry) => ({ status: entry.status, note: entry.note, createdAt: entry.created_at })),
    payments: data.payments.map((payment) => ({
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      expiresAt: payment.expires_at,
    })),
    proofs,
  };
}

export type OrderMutation = { ok: true; orderNumber: string } | { ok: false; reason: "not_found" | "invalid_state" | "unavailable" | "error"; detail?: string };

function adminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Confirms a manual transfer for the full order total (mark_order_paid also credits loyalty points). */
export async function confirmPayment(orderId: string): Promise<OrderMutation> {
  const admin = adminClient();
  if (!admin) return { ok: false, reason: "unavailable" };
  const { data: order, error } = await admin.from("orders").select("order_number, status, total").eq("id", orderId).maybeSingle();
  if (error) return { ok: false, reason: "error", detail: error.message };
  if (!order) return { ok: false, reason: "not_found" };
  if (order.status !== "pending_payment") return { ok: false, reason: "invalid_state" };
  const { data, error: rpcError } = await admin.rpc("mark_order_paid", {
    p_order_id: orderId,
    p_provider: MANUAL_PROVIDER,
    p_provider_reference: "",
    p_amount: order.total,
    p_method: BANK_TRANSFER_METHOD,
  });
  const result = data as { ok?: boolean; error?: string } | null;
  if (rpcError || !result?.ok) return { ok: false, reason: "error", detail: rpcError?.message ?? result?.error };
  return { ok: true, orderNumber: order.order_number };
}

/** Cancels an unpaid order: release_order restores stock, coupon use and redeemed points. */
export async function cancelOrder(orderId: string, note: string): Promise<OrderMutation> {
  const admin = adminClient();
  if (!admin) return { ok: false, reason: "unavailable" };
  const { data: order, error } = await admin.from("orders").select("order_number").eq("id", orderId).maybeSingle();
  if (error) return { ok: false, reason: "error", detail: error.message };
  if (!order) return { ok: false, reason: "not_found" };
  const { data, error: rpcError } = await admin.rpc("release_order", { p_order_id: orderId, p_status: "cancelled", p_note: note });
  const result = data as { ok?: boolean; error?: string } | null;
  if (rpcError) return { ok: false, reason: "error", detail: rpcError.message };
  if (!result?.ok) return { ok: false, reason: result?.error === "order_not_pending" ? "invalid_state" : "error", detail: result?.error };
  return { ok: true, orderNumber: order.order_number };
}

const FROM: Record<keyof typeof TRANSITION_TARGET, OrderStatus[]> = {
  start_processing: ["paid"],
  ship: ["paid", "processing"],
  deliver: ["shipped"],
};

/**
 * Fulfilment transitions. The update is conditional on the current status, so
 * two admins acting at once can't skip or repeat a step.
 */
export async function transitionOrder(
  orderId: string,
  action: keyof typeof TRANSITION_TARGET,
  staffId: string,
  extra: { courier?: string; trackingNumber?: string; note?: string } = {},
): Promise<OrderMutation> {
  const admin = adminClient();
  if (!admin) return { ok: false, reason: "unavailable" };
  const target = TRANSITION_TARGET[action];
  const { data, error } = await admin
    .from("orders")
    .update({
      status: target,
      ...(action === "ship" && { shipping_courier: extra.courier, tracking_number: extra.trackingNumber }),
    })
    .eq("id", orderId)
    .in("status", FROM[action])
    .select("order_number")
    .maybeSingle();
  if (error) return { ok: false, reason: "error", detail: error.message };
  if (!data) {
    const { data: exists } = await admin.from("orders").select("id").eq("id", orderId).maybeSingle();
    return { ok: false, reason: exists ? "invalid_state" : "not_found" };
  }
  const note = action === "ship" ? `Dikirim via ${extra.courier}, resi ${extra.trackingNumber}` : (extra.note ?? null);
  const { error: historyError } = await admin.from("order_status_history").insert({ order_id: orderId, status: target, note, changed_by: staffId });
  if (historyError) console.error("[admin] status history insert failed", historyError);
  return { ok: true, orderNumber: data.order_number };
}
