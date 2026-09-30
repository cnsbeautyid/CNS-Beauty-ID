import "server-only";

import { createClient } from "@/lib/supabase/server";

import { ADMIN_PAGE_SIZE, PAID_STATUSES, partnerTierFor } from "./model";

// Customers and partners, read as the staff member (staff_select_profiles,
// staff_* on partner tables). Partner approval writes through the staff RLS
// policies; the acting staff id comes from the verified session.

type Db = Awaited<ReturnType<typeof createClient>>;

async function profilesById(db: Db, ids: string[]) {
  if (ids.length === 0) return new Map<string, { name: string | null; email: string | null }>();
  const { data, error } = await db.from("profiles").select("id, full_name, email").in("id", ids);
  if (error) console.error("[admin] profile lookup failed", error);
  return new Map((data ?? []).map((row) => [row.id, { name: row.full_name, email: row.email }]));
}

export type AdminCustomer = { id: string; name: string | null; email: string | null; phone: string | null; createdAt: string; paidOrders: number; spend: number };
export type AdminCustomersPage = { status: "ok"; customers: AdminCustomer[]; page: number; pageCount: number; total: number } | { status: "error" };

export async function listCustomers(opts: { search?: string; page: number }): Promise<AdminCustomersPage> {
  const db = await createClient();
  const from = (opts.page - 1) * ADMIN_PAGE_SIZE;
  let query = db
    .from("profiles")
    .select("id, full_name, email, phone, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  // sanitizeSearch() already reduced the term to letters, digits, @ . - and spaces.
  if (opts.search) query = query.or(`full_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`);
  const { data, error, count } = await query;
  if (error) {
    console.error("[admin] listCustomers failed", error);
    return { status: "error" };
  }
  const ids = (data ?? []).map((row) => row.id);
  const stats = new Map<string, { paidOrders: number; spend: number }>();
  if (ids.length > 0) {
    const { data: orders, error: orderError } = await db.from("orders").select("user_id, total").in("user_id", ids).in("status", [...PAID_STATUSES]);
    if (orderError) {
      console.error("[admin] customer order stats failed", orderError);
      return { status: "error" };
    }
    for (const order of orders ?? []) {
      if (!order.user_id) continue;
      const current = stats.get(order.user_id) ?? { paidOrders: 0, spend: 0 };
      current.paidOrders += 1;
      current.spend += order.total;
      stats.set(order.user_id, current);
    }
  }
  const total = count ?? 0;
  return {
    status: "ok",
    total,
    page: opts.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    customers: (data ?? []).map((row) => ({
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      createdAt: row.created_at,
      ...(stats.get(row.id) ?? { paidOrders: 0, spend: 0 }),
    })),
  };
}

export type AdminApplication = {
  id: string;
  userId: string;
  memberType: "reseller" | "dropshipper";
  desiredLevel: number;
  fullName: string;
  phone: string;
  city: string | null;
  storeName: string | null;
  salesChannel: string | null;
  message: string | null;
  status: string;
  email: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AdminPartner = {
  userId: string;
  memberType: "reseller" | "dropshipper";
  tierLevel: number;
  storeName: string | null;
  isActive: boolean;
  approvedAt: string;
  name: string | null;
  email: string | null;
};

export async function getPartnerOverview(): Promise<{ applications: AdminApplication[]; partners: AdminPartner[] } | null> {
  const db = await createClient();
  const [applications, partners] = await Promise.all([
    db
      .from("reseller_applications")
      .select("id, user_id, member_type, desired_level, full_name, phone, city, store_name, sales_channel, message, status, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("partner_accounts").select("user_id, member_type, tier_level, store_name, is_active, approved_at").order("approved_at", { ascending: false }),
  ]);
  if (applications.error || partners.error) {
    console.error("[admin] getPartnerOverview failed", applications.error ?? partners.error);
    return null;
  }
  const people = await profilesById(db, [...new Set([...(applications.data ?? []).map((row) => row.user_id), ...(partners.data ?? []).map((row) => row.user_id)])]);
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  return {
    applications: (applications.data ?? [])
      .map((row) => ({
        id: row.id,
        userId: row.user_id,
        memberType: row.member_type,
        desiredLevel: row.desired_level,
        fullName: row.full_name,
        phone: row.phone,
        city: row.city,
        storeName: row.store_name,
        salesChannel: row.sales_channel,
        message: row.message,
        status: row.status,
        email: people.get(row.user_id)?.email ?? null,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
      }))
      .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)),
    partners: (partners.data ?? []).map((row) => ({
      userId: row.user_id,
      memberType: row.member_type,
      tierLevel: row.tier_level,
      storeName: row.store_name,
      isActive: row.is_active,
      approvedAt: row.approved_at,
      name: people.get(row.user_id)?.name ?? null,
      email: people.get(row.user_id)?.email ?? null,
    })),
  };
}

export type PartnerDecision =
  | { ok: true; userId: string; memberType: "reseller" | "dropshipper"; tierLevel: number | null }
  | { ok: false; reason: "not_found" | "invalid_state" | "error" };

/**
 * Approves (creates/reactivates the partner account at the chosen level) or
 * rejects a pending application. The application update is conditional on
 * `pending`, so a second click can't double-approve.
 */
export async function decideApplication(
  applicationId: string,
  staffId: string,
  decision: { decision: "approve"; tierLevel: number; storeName?: string } | { decision: "reject" },
): Promise<PartnerDecision> {
  const db = await createClient();
  const status = decision.decision === "approve" ? "approved" : "rejected";
  const { data: application, error } = await db
    .from("reseller_applications")
    .update({ status, reviewed_by: staffId, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("user_id, member_type, store_name")
    .maybeSingle();
  if (error) {
    console.error("[admin] application update failed", error);
    return { ok: false, reason: "error" };
  }
  if (!application) {
    const { data: exists } = await db.from("reseller_applications").select("id").eq("id", applicationId).maybeSingle();
    return { ok: false, reason: exists ? "invalid_state" : "not_found" };
  }
  if (decision.decision === "reject") return { ok: true, userId: application.user_id, memberType: application.member_type, tierLevel: null };

  const tierLevel = partnerTierFor(application.member_type, decision.tierLevel);
  const { error: partnerError } = await db.from("partner_accounts").upsert(
    {
      user_id: application.user_id,
      member_type: application.member_type,
      tier_level: tierLevel,
      store_name: decision.storeName ?? application.store_name,
      is_active: true,
      approved_by: staffId,
      approved_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (partnerError) {
    console.error("[admin] partner upsert failed; reverting application", partnerError);
    await db.from("reseller_applications").update({ status: "pending", reviewed_by: null, reviewed_at: null }).eq("id", applicationId);
    return { ok: false, reason: "error" };
  }
  return { ok: true, userId: application.user_id, memberType: application.member_type, tierLevel };
}

/** Activates/deactivates a partner or changes their level. Returns the previous values, or null. */
export async function updatePartner(userId: string, isActive: boolean, tierLevel: number): Promise<{ isActive: boolean; tierLevel: number } | null> {
  const db = await createClient();
  const { data: before, error: readError } = await db.from("partner_accounts").select("member_type, is_active, tier_level").eq("user_id", userId).maybeSingle();
  if (readError || !before) {
    if (readError) console.error("[admin] partner read failed", readError);
    return null;
  }
  const { error } = await db
    .from("partner_accounts")
    .update({ is_active: isActive, tier_level: partnerTierFor(before.member_type, tierLevel) })
    .eq("user_id", userId);
  if (error) {
    console.error("[admin] partner update failed", error);
    return null;
  }
  return { isActive: before.is_active, tierLevel: before.tier_level };
}
