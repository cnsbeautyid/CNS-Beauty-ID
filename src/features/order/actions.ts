"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { orderPath, ROUTES } from "@/constants/routes";
import { getServerEnv } from "@/lib/env/server";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { addItem, type CartState } from "@/services/cart/model";
import { CartStoreError, readCart, writeCart } from "@/services/cart/store";
import { PAYMENT_PROOF_BUCKET } from "@/services/order/order";

export type ProofResult = { ok: true } | { ok: false; message: string };

/**
 * Called after the browser uploaded a proof straight to the private bucket
 * (the storage policy only accepts {uid}/{own pending order}/…). Confirms the
 * file exists and notes it in the order history for the team.
 */
export async function recordPaymentProofAction(orderId: string): Promise<ProofResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
  if (!z.uuid().safeParse(orderId).success) return { ok: false, message: "Pesanan tidak ditemukan." };

  const db = await createClient();
  // RLS: only the owner's order is visible.
  const { data: order, error } = await db.from("orders").select("id, order_number, status").eq("id", orderId).maybeSingle();
  if (error || !order) return { ok: false, message: "Pesanan tidak ditemukan." };
  if (order.status !== "pending_payment") return { ok: false, message: "Pesanan ini tidak lagi menunggu pembayaran." };

  const { data: files, error: listError } = await db.storage.from(PAYMENT_PROOF_BUCKET).list(`${user.id}/${order.id}`, { limit: 20 });
  if (listError || !files?.some((file) => file.name && !file.name.startsWith("."))) {
    return { ok: false, message: "Bukti pembayaran belum terunggah. Silakan coba lagi." };
  }

  if (getServerEnv().SUPABASE_SERVICE_ROLE_KEY) {
    const { error: historyError } = await createAdminClient()
      .from("order_status_history")
      .insert({ order_id: order.id, status: "pending_payment", note: "Bukti pembayaran diunggah pelanggan" });
    if (historyError) console.error("[order] proof history note failed", historyError);
  }

  revalidatePath(orderPath(order.order_number));
  return { ok: true };
}

/**
 * "Pesan lagi": puts the still-available products of one of the user's own
 * orders back in the cart (current prices come from the quote, not the old
 * order), then opens the cart.
 */
export async function reorderAction(orderId: string): Promise<ProofResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
  if (!z.uuid().safeParse(orderId).success) return { ok: false, message: "Pesanan tidak ditemukan." };

  const db = await createClient();
  const { data: order, error } = await db.from("orders").select("id, order_items(product_id, variant_id, quantity)").eq("id", orderId).maybeSingle();
  if (error || !order) return { ok: false, message: "Pesanan tidak ditemukan." };

  const lines = order.order_items.flatMap((item) => (item.product_id ? [{ ...item, product_id: item.product_id }] : []));
  const catalog = createPublicClient();
  const { data: active } = catalog
    ? await catalog.from("products").select("id").eq("status", "active").in("id", [...new Set(lines.map((line) => line.product_id))])
    : { data: [] };
  const activeIds = new Set((active ?? []).map((product) => product.id));
  const available = lines.filter((line) => activeIds.has(line.product_id));
  if (available.length === 0) return { ok: false, message: "Produk dari pesanan ini sudah tidak tersedia." };

  try {
    const cart = available.reduce<CartState>((current, line) => {
      const change = addItem(current, line.product_id, line.variant_id ?? undefined, line.quantity);
      return "cart" in change ? change.cart : current;
    }, await readCart());
    await writeCart(cart);
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    return { ok: false, message: "Keranjang belum dapat diperbarui. Silakan coba lagi." };
  }

  revalidatePath(ROUTES.cart);
  redirect(ROUTES.cart);
}
