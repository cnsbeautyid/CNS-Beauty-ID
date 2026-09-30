import "server-only";

import { cache } from "react";

import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

import { parseLoyaltySettings, type EarnRule, type LoyaltySettings, type Tier } from "./model";

// CNS Rewards. Balances, history and redemptions are the customer's own rows
// (RLS); tiers, rules, rewards and settings are public programme data.
// Points only change through the ledger functions (post_loyalty_transaction,
// redeem_reward), never from the app.

export type Reward = { id: string; name: string; description: string | null; pointsCost: number; type: string; value: number; inStock: boolean };

export type LoyaltyProgramme = { tiers: Tier[]; rules: EarnRule[]; rewards: Reward[]; settings: LoyaltySettings };

export const getLoyaltyProgramme = cache(async (): Promise<LoyaltyProgramme | null> => {
  const db = createPublicClient();
  if (!db) return null;
  const [tiers, rules, rewards, settings] = await Promise.all([
    db.from("loyalty_tiers").select("id, slug, name, min_lifetime_points, benefits").order("min_lifetime_points"),
    db.from("loyalty_rules").select("event, points, per_amount, description").eq("is_active", true),
    db.from("rewards").select("id, name, description, points_cost, reward_type, reward_value, stock").eq("is_active", true).order("points_cost"),
    db.from("settings").select("value").eq("key", "loyalty").eq("is_public", true).maybeSingle(),
  ]);
  const failed = tiers.error ?? rules.error ?? rewards.error ?? settings.error;
  if (failed) {
    console.error("[loyalty] getLoyaltyProgramme failed", failed);
    return null;
  }
  return {
    tiers: (tiers.data ?? []).map((tier) => ({ id: tier.id, slug: tier.slug, name: tier.name, minLifetimePoints: tier.min_lifetime_points, benefits: tier.benefits })),
    rules: (rules.data ?? []).map((rule) => ({ event: rule.event, points: rule.points, perAmount: rule.per_amount, description: rule.description })),
    rewards: (rewards.data ?? []).map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      pointsCost: reward.points_cost,
      type: reward.reward_type,
      value: reward.reward_value,
      inStock: reward.stock === null || reward.stock > 0,
    })),
    settings: parseLoyaltySettings(settings.data?.value),
  };
});

export type LoyaltyAccount = { balance: number; lifetimePoints: number; tierId: string | null };

/** The customer's balance (no row yet means 0 points). Undefined on read failure. */
export async function getOwnLoyaltyAccount(): Promise<LoyaltyAccount | undefined> {
  const db = await createClient();
  const { data, error } = await db.from("loyalty_accounts").select("balance, lifetime_points, tier_id").maybeSingle();
  if (error) {
    console.error("[loyalty] getOwnLoyaltyAccount failed", error);
    return undefined;
  }
  return { balance: data?.balance ?? 0, lifetimePoints: data?.lifetime_points ?? 0, tierId: data?.tier_id ?? null };
}

export type LoyaltyTransaction = { id: string; event: string; points: number; description: string | null; createdAt: string };
export const HISTORY_PAGE_SIZE = 20;

export async function listOwnTransactions(page = 1): Promise<{ items: LoyaltyTransaction[]; hasMore: boolean } | null> {
  const db = await createClient();
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const { data, error } = await db
    .from("loyalty_transactions")
    .select("id, event, points, description, created_at")
    .order("created_at", { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE);
  if (error) {
    console.error("[loyalty] listOwnTransactions failed", error);
    return null;
  }
  const rows = data ?? [];
  return {
    hasMore: rows.length > HISTORY_PAGE_SIZE,
    items: rows.slice(0, HISTORY_PAGE_SIZE).map((row) => ({ id: row.id, event: row.event, points: row.points, description: row.description, createdAt: row.created_at })),
  };
}

export type Redemption = { id: string; rewardName: string; pointsSpent: number; status: string; createdAt: string; couponCode: string | null };

/**
 * The customer's redemptions (RLS). Voucher codes live in coupons, which
 * customers can't read, so codes are looked up with the service role for the
 * redemption rows RLS already proved are theirs.
 */
export async function listOwnRedemptions(): Promise<Redemption[] | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("reward_redemptions")
    .select("id, points_spent, status, created_at, coupon_id, rewards(name)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[loyalty] listOwnRedemptions failed", error);
    return null;
  }
  const couponIds = (data ?? []).flatMap((row) => (row.coupon_id ? [row.coupon_id] : []));
  const codes = new Map<string, string>();
  if (couponIds.length > 0 && getServerEnv().SUPABASE_SERVICE_ROLE_KEY) {
    const { data: coupons } = await createAdminClient().from("coupons").select("id, code").in("id", couponIds);
    for (const coupon of coupons ?? []) codes.set(coupon.id, coupon.code);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    rewardName: row.rewards?.name ?? "Hadiah",
    pointsSpent: row.points_spent,
    status: row.status,
    createdAt: row.created_at,
    couponCode: row.coupon_id ? (codes.get(row.coupon_id) ?? null) : null,
  }));
}

export type RedeemOutcome = { status: "ok"; couponCode: string | null } | { status: "rejected"; reason: string; balance?: number } | { status: "unavailable" } | { status: "error" };

/** Redeems a reward for the session user through public.redeem_reward (service role). */
export async function redeemReward(userId: string, rewardId: string): Promise<RedeemOutcome> {
  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return { status: "unavailable" };
  const { data, error } = await createAdminClient().rpc("redeem_reward", { p_user_id: userId, p_reward_id: rewardId });
  if (error) {
    console.error("[loyalty] redeem_reward failed", error);
    return { status: "error" };
  }
  const result = data as { ok?: boolean; coupon_code?: string | null; error?: string; balance?: number } | null;
  if (result?.ok) return { status: "ok", couponCode: result.coupon_code ?? null };
  return { status: "rejected", reason: result?.error ?? "unknown", balance: result?.balance };
}
