import { z } from "zod";

import { phoneSchema } from "@/services/checkout/schema";

// Partner programme helpers. CNS Beauty uses partner pricing (wholesale_prices):
// a partner earns the difference between their price and what they sell for.
// There is no commission ledger, so nothing here invents one.

export type PartnerType = "reseller" | "dropshipper";

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = { reseller: "Reseller", dropshipper: "Dropshipper" };

export type Partner = { memberType: PartnerType; tierLevel: number; storeName: string | null };

export type WholesaleTier = { level: number; name: string; minQty: number; unitPrice: number };

export type PriceRow = {
  productId: string;
  slug: string;
  name: string;
  retailPrice: number;
  available: boolean;
  /** The tier for the partner's own level, if the product has one. */
  own: WholesaleTier | null;
  /** Retail minus own price: a factual per-unit margin at the recommended retail price. */
  marginPerUnit: number | null;
  /** All tiers for the partner's type, lowest level first. */
  tiers: WholesaleTier[];
};

export function buildPriceRow(
  product: { id: string; slug: string; name: string; price: number; available: boolean },
  tiers: WholesaleTier[],
  level: number,
): PriceRow {
  const sorted = [...tiers].sort((a, b) => a.level - b.level);
  const own = sorted.find((tier) => tier.level === level) ?? null;
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    retailPrice: product.price,
    available: product.available,
    own,
    marginPerUnit: own ? product.price - own.unitPrice : null,
    tiers: sorted,
  };
}

export const COMPLETED_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

export type PartnerOrder = { status: string; total: number; createdAt: string; items: { name: string; quantity: number; lineTotal: number }[] };

export type SalesSummary = {
  /** Sum of paid-and-later orders (what the partner bought from CNS). */
  purchaseTotal: number;
  paidOrders: number;
  pendingOrders: number;
  months: { key: string; label: string; total: number }[];
  topProducts: { name: string; quantity: number; total: number }[];
};

const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" });
const labelFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", month: "short" });
const monthKey = (date: Date) => keyFormat.format(date).slice(0, 7);

/** Dashboard figures from the partner's own orders, bucketed by Asia/Jakarta month. */
export function summarizeSales(orders: PartnerOrder[], now = new Date(), monthsBack = 6): SalesSummary {
  const done = orders.filter((order) => (COMPLETED_STATUSES as readonly string[]).includes(order.status));
  const months = Array.from({ length: monthsBack }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1 - index), 15));
    return { key: monthKey(date), label: labelFormat.format(date), total: 0 };
  });
  for (const order of done) {
    const bucket = months.find((month) => month.key === monthKey(new Date(order.createdAt)));
    if (bucket) bucket.total += order.total;
  }

  const products = new Map<string, { name: string; quantity: number; total: number }>();
  for (const item of done.flatMap((order) => order.items)) {
    const current = products.get(item.name) ?? { name: item.name, quantity: 0, total: 0 };
    current.quantity += item.quantity;
    current.total += item.lineTotal;
    products.set(item.name, current);
  }

  return {
    purchaseTotal: done.reduce((sum, order) => sum + order.total, 0),
    paidOrders: done.length,
    pendingOrders: orders.filter((order) => order.status === "pending_payment").length,
    months,
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.total - a.total).slice(0, 5),
  };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

export const applicationSchema = z
  .object({
    memberType: z.enum(["reseller", "dropshipper"]),
    desiredLevel: z.coerce.number().int().min(1).max(4),
    fullName: z.string().trim().min(2, "Masukkan nama lengkap.").max(80),
    phone: phoneSchema,
    city: z.string().trim().min(2, "Masukkan kota.").max(80),
    storeName: optionalText(80),
    salesChannel: z.string().trim().min(2, "Ceritakan di mana kamu akan berjualan.").max(200),
    message: optionalText(500),
  })
  // Dropshippers have a single level; the column still requires 1–4.
  .transform((value) => (value.memberType === "dropshipper" ? { ...value, desiredLevel: 1 } : value));

export type ApplicationValues = z.input<typeof applicationSchema>;
export type ApplicationInput = z.output<typeof applicationSchema>;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Sedang ditinjau",
  approved: "Disetujui",
  rejected: "Belum disetujui",
};
