import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createPublicClient } from "@/lib/supabase/public";

import { DEFAULT_PAYMENT_SETTINGS, parsePaymentSettings, type PaymentSettings } from "./payment-settings";

export const MANUAL_PROVIDER = "manual";
export const BANK_TRANSFER_METHOD = "bank_transfer";

/** Public manual-transfer settings (settings.payment). Defaults on failure. */
export const getPaymentSettings = cache(async (): Promise<PaymentSettings> => {
  const db = createPublicClient();
  if (!db) return DEFAULT_PAYMENT_SETTINGS;
  const { data, error } = await db.from("settings").select("value").eq("key", "payment").eq("is_public", true).maybeSingle();
  if (error) {
    console.error("[checkout] getPaymentSettings failed", error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
  return parsePaymentSettings(data?.value);
});

const shippingInfoSchema = z.object({
  origin: z.string().trim().min(1).max(120).optional().catch(undefined),
  dispatch_days: z.string().trim().min(1).max(20).optional().catch(undefined),
});

export type ShippingInfo = { origin?: string; dispatchDays?: string };

/** Dispatch origin and handling time from the public settings.shipping row. */
export const getShippingInfo = cache(async (): Promise<ShippingInfo> => {
  const db = createPublicClient();
  if (!db) return {};
  const { data, error } = await db.from("settings").select("value").eq("key", "shipping").eq("is_public", true).maybeSingle();
  if (error) {
    console.error("[checkout] getShippingInfo failed", error);
    return {};
  }
  const parsed = shippingInfoSchema.safeParse(data?.value ?? {});
  return parsed.success ? { origin: parsed.data.origin, dispatchDays: parsed.data.dispatch_days } : {};
});

export function paymentDeadline(createdAt: Date, expiryHours: number): Date {
  return new Date(createdAt.getTime() + expiryHours * 60 * 60 * 1000);
}
