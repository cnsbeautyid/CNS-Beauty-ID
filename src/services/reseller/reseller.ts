import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/session";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

import { buildPriceRow, type ApplicationInput, type Partner, type PartnerOrder, type PriceRow, type WholesaleTier } from "./model";

// Partner data, always read as the signed-in user: partner_accounts and
// reseller_applications are own-row RLS, and wholesale_prices are visible only
// to *active* partners of the same type (partner_read_wholesale_prices).
// Approval happens in the back office; the app never writes partner_accounts.

/** The caller's active partner account; null if not a partner, undefined on failure. */
export const getOwnPartner = cache(async (): Promise<Partner | null | undefined> => {
  const db = await createClient();
  const { data, error } = await db.from("partner_accounts").select("member_type, tier_level, store_name, is_active").maybeSingle();
  if (error) {
    console.error("[reseller] getOwnPartner failed", error);
    return undefined;
  }
  if (!data?.is_active) return null;
  return { memberType: data.member_type, tierLevel: data.tier_level, storeName: data.store_name };
});

export type Application = { status: string; memberType: Partner["memberType"]; createdAt: string };

/** The caller's latest application; null if none, undefined on failure. */
export async function getOwnApplication(): Promise<Application | null | undefined> {
  const db = await createClient();
  const { data, error } = await db
    .from("reseller_applications")
    .select("status, member_type, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[reseller] getOwnApplication failed", error);
    return undefined;
  }
  return data ? { status: data.status, memberType: data.member_type, createdAt: data.created_at } : null;
}

/** RLS own_insert_reseller_applications only allows the caller's own pending, unreviewed row. */
export async function submitApplication(userId: string, input: ApplicationInput): Promise<boolean> {
  const db = await createClient();
  const { error } = await db.from("reseller_applications").insert({
    user_id: userId,
    member_type: input.memberType,
    desired_level: input.desiredLevel,
    full_name: input.fullName,
    phone: input.phone,
    city: input.city,
    store_name: input.storeName ?? null,
    sales_channel: input.salesChannel,
    message: input.message ?? null,
  });
  if (error) console.error("[reseller] submitApplication failed", error);
  return !error;
}

/** Price list for the partner's type, marked with their own level. Null on failure. */
export async function getPartnerPriceList(partner: Partner): Promise<PriceRow[] | null> {
  const catalog = createPublicClient();
  if (!catalog) return null;
  const db = await createClient();
  const [products, prices] = await Promise.all([
    catalog.from("products").select("id, slug, name, price, stock").eq("status", "active").order("name"),
    db.from("wholesale_prices").select("product_id, level, name, min_qty, unit_price").eq("member_type", partner.memberType),
  ]);
  if (products.error || prices.error) {
    console.error("[reseller] getPartnerPriceList failed", products.error ?? prices.error);
    return null;
  }
  const byProduct = new Map<string, WholesaleTier[]>();
  for (const row of prices.data ?? []) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push({ level: row.level, name: row.name, minQty: row.min_qty, unitPrice: row.unit_price });
    byProduct.set(row.product_id, list);
  }
  return (products.data ?? []).map((product) =>
    buildPriceRow(
      { id: product.id, slug: product.slug, name: product.name, price: product.price, available: product.stock > 0 },
      byProduct.get(product.id) ?? [],
      partner.tierLevel,
    ),
  );
}

export type PartnerOrderRow = PartnerOrder & { orderNumber: string; isDropship: boolean };

/** The caller's partner-priced orders (RLS own_select_orders), newest first. Null on failure. */
export async function listPartnerOrders(limit = 200): Promise<PartnerOrderRow[] | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("orders")
    .select("order_number, status, total, created_at, is_dropship, order_items(product_name, quantity, line_total)")
    .not("partner_type", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[reseller] listPartnerOrders failed", error);
    return null;
  }
  return (data ?? []).map((row) => ({
    orderNumber: row.order_number,
    status: row.status,
    total: row.total,
    createdAt: row.created_at,
    isDropship: row.is_dropship,
    items: row.order_items.map((item) => ({ name: item.product_name, quantity: item.quantity, lineTotal: item.line_total })),
  }));
}

export type PartnerGate = { status: "ok"; partner: Partner } | { status: "not_partner" } | { status: "error" };

/**
 * Portal pages: sign-in redirect for guests, then the caller's own active
 * partner account. The partner row (RLS) is the only authority for access.
 */
export async function requirePartner(nextPath: string): Promise<PartnerGate> {
  await requireUser(nextPath);
  const partner = await getOwnPartner();
  if (partner === undefined) return { status: "error" };
  return partner ? { status: "ok", partner } : { status: "not_partner" };
}
