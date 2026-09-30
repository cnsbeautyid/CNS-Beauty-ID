import { z } from "zod";

import type { Database } from "@/types/database";

// Pure admin rules shared by pages, actions and tests. The database remains
// the authority (RLS, triggers, mark_order_paid/release_order); these rules
// decide which controls to offer and validate input before it gets there.

type OrderStatus = Database["public"]["Enums"]["order_status"];

export type OrderAction = "confirm_payment" | "cancel" | "start_processing" | "ship" | "deliver";

const ORDER_ACTIONS: Partial<Record<OrderStatus, OrderAction[]>> = {
  pending_payment: ["confirm_payment", "cancel"],
  paid: ["start_processing", "ship"],
  processing: ["ship"],
  shipped: ["deliver"],
};

export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  confirm_payment: "Konfirmasi pembayaran",
  cancel: "Batalkan pesanan",
  start_processing: "Proses pesanan",
  ship: "Tandai dikirim",
  deliver: "Tandai diterima",
};

/** Actions an admin may take on an order in this status. */
export function allowedOrderActions(status: string): OrderAction[] {
  return ORDER_ACTIONS[status as OrderStatus] ?? [];
}

/** Target status for the simple (non-RPC) transitions. */
export const TRANSITION_TARGET = { start_processing: "processing", ship: "shipped", deliver: "delivered" } as const satisfies Partial<
  Record<OrderAction, OrderStatus>
>;

export const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;
const isPaid = (status: string) => (PAID_STATUSES as readonly string[]).includes(status);

export type KpiOrder = { status: string; total: number; userId: string | null; partnerType: string | null; aiConversationId: string | null };

export type Kpis = {
  gmv: number;
  paidOrders: number;
  pendingPayment: number;
  averageOrderValue: number;
  /** Share of paying customers with 2+ paid orders in the window; null without paying customers. */
  repeatPurchaseRate: number | null;
  aiAssistedGmv: number;
  aiAssistedOrders: number;
  resellerGmv: number;
  resellerOrders: number;
};

/** Dashboard KPIs from the window's orders. Conversion needs analytics events (Phase 16), so it isn't computed. */
export function computeKpis(orders: KpiOrder[]): Kpis {
  const paid = orders.filter((order) => isPaid(order.status));
  const sum = (rows: KpiOrder[]) => rows.reduce((total, order) => total + order.total, 0);
  const perCustomer = new Map<string, number>();
  for (const order of paid) if (order.userId) perCustomer.set(order.userId, (perCustomer.get(order.userId) ?? 0) + 1);
  const repeaters = [...perCustomer.values()].filter((count) => count >= 2).length;
  const ai = paid.filter((order) => order.aiConversationId);
  const partner = paid.filter((order) => order.partnerType);
  const gmv = sum(paid);

  return {
    gmv,
    paidOrders: paid.length,
    pendingPayment: orders.filter((order) => order.status === "pending_payment").length,
    averageOrderValue: paid.length > 0 ? Math.round(gmv / paid.length) : 0,
    repeatPurchaseRate: perCustomer.size > 0 ? repeaters / perCustomer.size : null,
    aiAssistedGmv: sum(ai),
    aiAssistedOrders: ai.length,
    resellerGmv: sum(partner),
    resellerOrders: partner.length,
  };
}

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Menunggu review",
  approved: "Disetujui",
  archived: "Diarsipkan",
};

export const PUBLISH_STATUS_LABELS: Record<string, string> = { draft: "Draft", active: "Aktif", archived: "Diarsipkan" };

const uuid = z.uuid("ID tidak valid.");
const rupiah = z.coerce.number().int("Harus bilangan bulat.").min(0, "Tidak boleh negatif.").max(100_000_000, "Terlalu besar.");
const stock = z.coerce.number().int("Harus bilangan bulat.").min(0, "Tidak boleh negatif.").max(1_000_000, "Terlalu besar.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Terlalu panjang.")
    .optional()
    .transform((value) => value || undefined);

export const productUpdateSchema = z
  .object({
    productId: uuid,
    price: rupiah.refine((value) => value > 0, "Harga harus lebih dari 0."),
    comparePrice: z
      .union([z.literal(""), rupiah])
      .optional()
      .transform((value) => (value === "" || value === undefined || value === 0 ? null : value)),
    stock,
    lowStockThreshold: stock,
    status: z.enum(["draft", "active", "archived"]),
    isFeatured: z.boolean(),
  })
  .refine((value) => value.comparePrice === null || value.comparePrice > value.price, {
    path: ["comparePrice"],
    message: "Harga coret harus lebih tinggi dari harga jual.",
  });
export type ProductUpdateValues = z.input<typeof productUpdateSchema>;
export type ProductUpdateInput = z.output<typeof productUpdateSchema>;

export const stockUpdateSchema = z.object({ productId: uuid, stock });

export const reviewDecisionSchema = z.object({
  kind: z.enum(["product_copy", "benefit", "faq"]),
  id: uuid,
  decision: z.enum(["approve", "draft"]),
  evidenceReference: optionalText(300),
});

export const shipSchema = z.object({
  orderId: uuid,
  courier: z.string().trim().min(2, "Masukkan nama kurir.").max(40, "Terlalu panjang."),
  trackingNumber: z
    .string()
    .trim()
    .min(3, "Masukkan nomor resi.")
    .max(60, "Terlalu panjang.")
    .regex(/^[A-Za-z0-9-]+$/, "Nomor resi hanya huruf, angka, dan tanda hubung."),
});

export const orderActionSchema = z.object({
  orderId: uuid,
  action: z.enum(["confirm_payment", "cancel", "start_processing", "deliver"]),
  note: optionalText(300),
});

export const applicationDecisionSchema = z.discriminatedUnion("decision", [
  z.object({ applicationId: uuid, decision: z.literal("approve"), tierLevel: z.coerce.number().int().min(1).max(4), storeName: optionalText(80) }),
  z.object({ applicationId: uuid, decision: z.literal("reject") }),
]);

export const partnerUpdateSchema = z.object({
  userId: uuid,
  isActive: z.boolean(),
  tierLevel: z.coerce.number().int().min(0).max(4),
});

export const knowledgeDecisionSchema = z.object({ id: uuid, decision: z.enum(["approve", "draft", "archive"]) });

export const KNOWLEDGE_TARGET = { approve: "approved", draft: "draft", archive: "archived" } as const;

/** Dropshippers have one price row, stored at level 0; resellers use levels 1–4. */
export function partnerTierFor(memberType: "reseller" | "dropshipper", requested: number): number {
  return memberType === "dropshipper" ? 0 : Math.min(Math.max(Math.trunc(requested), 1), 4);
}

export const ADMIN_PAGE_SIZE = 25;

/** Free-text search safe to embed in a PostgREST `or=(…ilike…)` filter: letters, digits, @ . - and spaces only. */
export function sanitizeSearch(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "")
    .replace(/[^\p{L}\p{N}@.\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
