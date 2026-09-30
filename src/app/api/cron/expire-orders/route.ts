import { NextResponse, type NextRequest } from "next/server";

import { authorized } from "@/lib/auth/cron";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentSettings } from "@/services/checkout/payment";
import { PAYMENT_PROOF_BUCKET } from "@/services/order/order";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron: expires unpaid web orders past the payment window through
 * public.release_order, which returns reserved stock, coupon usage and points.
 * Orders with an uploaded proof are left for the team to verify, and orders
 * from other channels (WhatsApp/admin) are never touched.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!env.CRON_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), env.CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { expiryHours } = await getPaymentSettings();
  const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, user_id")
    .eq("status", "pending_payment")
    .eq("source", "web")
    .lt("created_at", cutoff)
    .limit(100);
  if (error) {
    console.error("[cron] expire-orders query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let expired = 0;
  let skipped = 0;
  for (const order of orders) {
    if (order.user_id) {
      const { data: proofs } = await admin.storage.from(PAYMENT_PROOF_BUCKET).list(`${order.user_id}/${order.id}`, { limit: 1 });
      if (proofs && proofs.length > 0) {
        skipped += 1;
        continue;
      }
    }
    const { data, error: releaseError } = await admin.rpc("release_order", {
      p_order_id: order.id,
      p_status: "expired",
      p_note: "Batas waktu pembayaran habis",
    });
    if (releaseError) console.error("[cron] release_order failed", { orderId: order.id, releaseError });
    else if ((data as { ok?: boolean } | null)?.ok) expired += 1;
  }

  return NextResponse.json({ expired, skipped, checked: orders.length }, { headers: { "Cache-Control": "no-store" } });
}
