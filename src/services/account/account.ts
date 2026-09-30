import "server-only";

import { clientEnv } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_CARD_COLUMNS, toProductCard, type ProductCardRow } from "@/services/catalog/mapper";
import type { ProductCardData } from "@/types/product";

import { ORDERS_PAGE_SIZE } from "./schemas";

// Everything here runs as the signed-in user; RLS limits every query to
// that user's own rows, so no user id is ever taken from the request.

export type OrderSummary = { orderNumber: string; createdAt: string; status: string; total: number; itemCount: number };
export type OrdersPage = { status: "ok"; orders: OrderSummary[]; page: number; pageCount: number; total: number } | { status: "error" };

export async function listOwnOrders(page: number, pageSize = ORDERS_PAGE_SIZE): Promise<OrdersPage> {
  try {
    const db = await createClient();
    const from = (page - 1) * pageSize;
    const { data, error, count } = await db
      .from("orders")
      .select("order_number, created_at, status, total, order_items(quantity)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const total = count ?? data.length;
    return {
      status: "ok",
      page,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      orders: data.map((row) => ({
        orderNumber: row.order_number,
        createdAt: row.created_at,
        status: row.status,
        total: row.total,
        itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    };
  } catch (error) {
    console.error("[account] listOwnOrders failed", error);
    return { status: "error" };
  }
}

export type Profile = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  birthDate: string | null;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
};

export async function getOwnProfile(): Promise<Profile | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("profiles")
    .select("full_name, email, phone, whatsapp, birth_date, marketing_opt_in, whatsapp_opt_in")
    .maybeSingle();
  if (error) {
    console.error("[account] getOwnProfile failed", error);
    return null;
  }
  if (!data) return null;
  return {
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    birthDate: data.birth_date,
    marketingOptIn: data.marketing_opt_in,
    whatsappOptIn: data.whatsapp_opt_in,
  };
}

export type LoyaltySummary = { balance: number; lifetimePoints: number; tierName: string | null };

/** Read-only balance from the loyalty ledger (no row yet = 0 points). Null on failure. */
export async function getLoyaltySummary(): Promise<LoyaltySummary | null> {
  const db = await createClient();
  const { data, error } = await db.from("loyalty_accounts").select("balance, lifetime_points, loyalty_tiers(name)").maybeSingle();
  if (error) {
    console.error("[account] getLoyaltySummary failed", error);
    return null;
  }
  return { balance: data?.balance ?? 0, lifetimePoints: data?.lifetime_points ?? 0, tierName: data?.loyalty_tiers?.name ?? null };
}

export type WishlistItem = ProductCardData & { productId: string };

/** Saved products that are still published (RLS hides inactive products). */
export async function listWishlist(): Promise<WishlistItem[] | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("wishlists")
    .select(`created_at, products(id, ${PRODUCT_CARD_COLUMNS})`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[account] listWishlist failed", error);
    return null;
  }
  return data.flatMap((row) => {
    const product = row.products as (ProductCardRow & { id: string }) | null;
    return product ? [{ ...toProductCard(product, clientEnv.NEXT_PUBLIC_SUPABASE_URL), productId: product.id }] : [];
  });
}

export async function listWishlistIds(): Promise<string[]> {
  const db = await createClient();
  const { data, error } = await db.from("wishlists").select("product_id");
  if (error) {
    console.error("[account] listWishlistIds failed", error);
    return [];
  }
  return data.map((row) => row.product_id);
}
