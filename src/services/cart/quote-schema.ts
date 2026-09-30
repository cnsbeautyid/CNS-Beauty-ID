import { z } from "zod";

import { formatIDR } from "@/lib/utils/format";

// Shape returned by public.quote_cart (the authoritative pricing function).

const money = z.number().int().nonnegative();

export const quoteErrorSchema = z.object({
  code: z.string(),
  product_id: z.string().optional(),
  available: z.number().optional(),
  min_qty: z.number().optional(),
  min_subtotal: z.number().optional(),
  balance: z.number().optional(),
});

const quoteSchema = z.object({
  lines: z.array(
    z.object({
      product_id: z.uuid(),
      variant_id: z.uuid().nullable(),
      slug: z.string(),
      name: z.string(),
      variant_name: z.string().nullable(),
      sku: z.string(),
      unit_price: money,
      quantity: z.number().int().positive(),
      line_total: money,
      image_url: z.string().nullable(),
      stock: z.number().int(),
    }),
  ),
  subtotal: money,
  discount_total: money,
  points_applied: z.number().int().nonnegative(),
  points_discount: money,
  shipping_total: money,
  total: money,
  coupon: z.object({ id: z.uuid(), code: z.string(), type: z.string(), description: z.string().nullable() }).nullable(),
  free_shipping_threshold: money,
  pricing: z.string(),
  errors: z.array(quoteErrorSchema),
});

export type QuoteError = z.infer<typeof quoteErrorSchema>;

export type CartQuote = {
  lines: {
    productId: string;
    variantId: string | null;
    slug: string;
    name: string;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    imageUrl: string | null;
  }[];
  subtotal: number;
  discountTotal: number;
  /** Loyalty points redeemed in this quote and their rupiah value (1 point = settings.loyalty.point_value). */
  pointsApplied: number;
  pointsDiscount: number;
  shippingTotal: number;
  total: number;
  coupon: { code: string; description: string | null } | null;
  freeShippingThreshold: number;
  errors: QuoteError[];
};

/** Validates the RPC response. Returns null if it doesn't match the contract. */
export function toCartQuote(raw: unknown): CartQuote | null {
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return null;
  const q = parsed.data;
  return {
    lines: q.lines.map((line) => ({
      productId: line.product_id,
      variantId: line.variant_id,
      slug: line.slug,
      name: line.name,
      variantName: line.variant_name,
      unitPrice: line.unit_price,
      quantity: line.quantity,
      lineTotal: line.line_total,
      imageUrl: line.image_url,
    })),
    subtotal: q.subtotal,
    discountTotal: q.discount_total,
    pointsApplied: q.points_applied,
    pointsDiscount: q.points_discount,
    shippingTotal: q.shipping_total,
    total: q.total,
    coupon: q.coupon ? { code: q.coupon.code, description: q.coupon.description } : null,
    freeShippingThreshold: q.free_shipping_threshold,
    errors: q.errors,
  };
}

export const COUPON_ERROR_CODES = new Set([
  "coupon_invalid",
  "coupon_expired",
  "coupon_not_started",
  "coupon_exhausted",
  "coupon_min_subtotal",
  "coupon_already_used",
  "not_available_for_partners",
]);

export function quoteErrorMessage(error: QuoteError): string {
  switch (error.code) {
    case "product_unavailable":
      return "Produk ini sudah tidak tersedia.";
    case "variant_unavailable":
      return "Varian ini sudah tidak tersedia.";
    case "out_of_stock":
      return "Stok habis.";
    case "insufficient_stock":
      return error.available !== undefined ? `Stok tersisa ${error.available}.` : "Stok tidak mencukupi.";
    case "min_qty":
      return error.min_qty !== undefined ? `Minimal pembelian ${error.min_qty} pcs.` : "Jumlah di bawah minimal pembelian.";
    case "wholesale_price_missing":
      return "Harga mitra untuk produk ini belum tersedia.";
    case "not_available_for_partners":
      return "Kupon dan poin tidak berlaku untuk akun mitra.";
    case "coupon_invalid":
      return "Kode kupon tidak valid.";
    case "coupon_expired":
      return "Kupon sudah kedaluwarsa.";
    case "coupon_not_started":
      return "Kupon belum berlaku.";
    case "coupon_exhausted":
      return "Kuota kupon sudah habis.";
    case "coupon_min_subtotal":
      return error.min_subtotal !== undefined
        ? `Minimal belanja ${formatIDR(error.min_subtotal)} untuk kupon ini.`
        : "Belanja belum memenuhi minimal kupon.";
    case "coupon_already_used":
      return "Kupon ini sudah pernah kamu gunakan.";
    case "cart_empty":
      return "Keranjangmu kosong.";
    case "points_insufficient":
      return error.balance !== undefined ? `Poin tidak mencukupi (saldo ${error.balance.toLocaleString("id-ID")} poin).` : "Poin tidak mencukupi.";
    default:
      return "Ada kendala pada keranjang. Silakan coba lagi.";
  }
}
