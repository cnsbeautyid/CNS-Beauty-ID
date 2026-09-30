import type { BadgeTone } from "@/components/ui/badge";
import type { Database } from "@/types/database";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: "Menunggu pembayaran", tone: "brand" },
  paid: { label: "Dibayar", tone: "success" },
  processing: { label: "Diproses", tone: "success" },
  shipped: { label: "Dikirim", tone: "success" },
  delivered: { label: "Diterima", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
  payment_failed: { label: "Pembayaran gagal", tone: "error" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  refunded: { label: "Dana dikembalikan", tone: "neutral" },
};

const FALLBACK = { label: "Status tidak diketahui", tone: "neutral" } as const;

export function orderStatusInfo(status: string): { label: string; tone: BadgeTone } {
  return status in ORDER_STATUS ? ORDER_STATUS[status as OrderStatus] : FALLBACK;
}
