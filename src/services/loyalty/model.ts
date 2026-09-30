import { z } from "zod";

import { formatIDR } from "@/lib/utils/format";

// CNS Rewards presentation helpers. Every number shown comes from the loyalty
// ledger or the owner's settings; nothing here computes a balance.

export type Tier = { id: string; slug: string; name: string; minLifetimePoints: number; benefits: string[] };

export type TierProgress = {
  current: Tier | null;
  next: Tier | null;
  /** Points still needed for the next tier (0 at the top tier). */
  remaining: number;
  /** 0–100 progress between the current and the next tier. */
  percent: number;
};

export function tierProgress(lifetimePoints: number, tiers: Tier[]): TierProgress {
  const sorted = [...tiers].sort((a, b) => a.minLifetimePoints - b.minLifetimePoints);
  const current = [...sorted].reverse().find((tier) => lifetimePoints >= tier.minLifetimePoints) ?? null;
  const next = sorted.find((tier) => tier.minLifetimePoints > lifetimePoints) ?? null;
  if (!next) return { current, next: null, remaining: 0, percent: 100 };
  const floor = current?.minLifetimePoints ?? 0;
  const span = Math.max(1, next.minLifetimePoints - floor);
  return {
    current,
    next,
    remaining: next.minLifetimePoints - lifetimePoints,
    percent: Math.max(0, Math.min(100, Math.round(((lifetimePoints - floor) / span) * 100))),
  };
}

export type LoyaltyEvent = "purchase" | "review" | "referral" | "birthday" | "signup" | "redemption" | "adjustment" | "expiry" | "reversal";

export const EVENT_LABELS: Record<LoyaltyEvent, string> = {
  purchase: "Belanja",
  review: "Ulasan",
  referral: "Referral",
  birthday: "Ulang tahun",
  signup: "Pendaftaran",
  redemption: "Penukaran",
  adjustment: "Penyesuaian",
  expiry: "Kedaluwarsa",
  reversal: "Pengembalian poin",
};

export function eventLabel(event: string): string {
  return event in EVENT_LABELS ? EVENT_LABELS[event as LoyaltyEvent] : "Aktivitas poin";
}

export type EarnRule = { event: string; points: number; perAmount: number | null; description: string | null };

/** "1 poin untuk setiap Rp100" from the rule itself; falls back to the owner's description. */
export function describeRule(rule: EarnRule): string {
  if (rule.perAmount && rule.perAmount > 0) return `${rule.points} poin untuk setiap ${formatIDR(rule.perAmount)} yang dibayarkan`;
  if (rule.points > 0) return `${rule.points} poin`;
  return rule.description ?? eventLabel(rule.event);
}

const settingsSchema = z.object({
  point_value: z.number().int().min(0).catch(0),
  max_redeem_percent: z.number().int().min(0).max(100).catch(0),
});

export type LoyaltySettings = { pointValue: number; maxRedeemPercent: number };

export function parseLoyaltySettings(raw: unknown): LoyaltySettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  return parsed.success ? { pointValue: parsed.data.point_value, maxRedeemPercent: parsed.data.max_redeem_percent } : { pointValue: 0, maxRedeemPercent: 0 };
}

export const MAX_POINTS_INPUT = 10_000_000;

/** Parses ?poin= (URL state). Anything invalid means "no points". */
export function parsePointsParam(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const points = Number(raw);
  return Number.isInteger(points) && points > 0 && points <= MAX_POINTS_INPUT ? points : 0;
}
