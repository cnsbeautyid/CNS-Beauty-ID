"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { recordAudit } from "@/services/admin/audit";
import { authorizeStaff } from "@/services/admin/auth";
import { reviewContent, setStock, updateProduct } from "@/services/admin/catalog";
import { decideKnowledge } from "@/services/admin/knowledge";
import {
  applicationDecisionSchema,
  knowledgeDecisionSchema,
  orderActionSchema,
  partnerUpdateSchema,
  productUpdateSchema,
  reviewDecisionSchema,
  shipSchema,
  stockUpdateSchema,
} from "@/services/admin/model";
import { cancelOrder, confirmPayment, transitionOrder, type OrderMutation } from "@/services/admin/orders";
import { decideApplication, updatePartner } from "@/services/admin/people";

// Every admin mutation: verify the staff role on the server (never trust the
// browser), validate with Zod, act through RLS or the ledger functions, then
// append to admin_audit_log as the acting staff member.

export type AdminActionResult = { ok: boolean; message: string; fieldErrors?: Record<string, string> };

const DENIED: AdminActionResult = { ok: false, message: "Akses ditolak." };
const INVALID = (message = "Data tidak valid."): AdminActionResult => ({ ok: false, message });

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export async function updateProductAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = productUpdateSchema.safeParse(values);
  if (!parsed.success) return { ...INVALID("Periksa kembali isian produk."), fieldErrors: fieldErrors(parsed.error.issues) };

  const result = await updateProduct(parsed.data);
  if (!result) return INVALID("Produk belum dapat disimpan. Silakan coba lagi.");
  if (Object.keys(result.changes).length > 0) {
    await recordAudit({ action: "product.update", entityType: "product", entityId: parsed.data.productId, summary: { name: result.name, changes: result.changes } });
  }
  revalidatePath(ROUTES.admin.products, "layout");
  revalidatePath(ROUTES.products, "layout");
  return { ok: true, message: "Produk disimpan." };
}

export async function setStockAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = stockUpdateSchema.safeParse(values);
  if (!parsed.success) return INVALID(parsed.error.issues[0]?.message);

  const result = await setStock(parsed.data.productId, parsed.data.stock);
  if (!result) return INVALID("Stok belum dapat disimpan. Silakan coba lagi.");
  await recordAudit({ action: "inventory.set_stock", entityType: "product", entityId: parsed.data.productId, summary: { name: result.name, from: result.from, to: parsed.data.stock } });
  revalidatePath(ROUTES.admin.inventory);
  revalidatePath(ROUTES.products, "layout");
  return { ok: true, message: `Stok ${result.name} menjadi ${parsed.data.stock}.` };
}

export async function reviewContentAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = reviewDecisionSchema.safeParse(values);
  if (!parsed.success) return INVALID(parsed.error.issues[0]?.message);
  const { kind, id, decision, evidenceReference } = parsed.data;

  const productId = await reviewContent(kind, id, decision, evidenceReference);
  if (!productId) return INVALID("Status review belum dapat disimpan.");
  await recordAudit({ action: `claim.${decision}`, entityType: kind, entityId: id, summary: { productId, evidenceReference } });
  revalidatePath(`${ROUTES.admin.products}/${productId}`);
  revalidatePath(ROUTES.products, "layout");
  return { ok: true, message: decision === "approve" ? "Disetujui. Teks ini sekarang tampil di toko." : "Dikembalikan ke draft dan disembunyikan dari toko." };
}

const ORDER_FAILURES: Record<Exclude<OrderMutation, { ok: true }>["reason"], string> = {
  not_found: "Pesanan tidak ditemukan.",
  invalid_state: "Status pesanan sudah berubah. Muat ulang halaman.",
  unavailable: "Aksi pesanan belum tersedia: kunci layanan server belum dikonfigurasi.",
  error: "Pesanan belum dapat diperbarui. Silakan coba lagi.",
};

async function finishOrder(result: OrderMutation, action: string, orderId: string, summary: Record<string, string | undefined>, message: string) {
  if (!result.ok) {
    if (result.reason === "error") console.error(`[admin] ${action} failed`, result.detail);
    return INVALID(ORDER_FAILURES[result.reason]);
  }
  await recordAudit({ action, entityType: "order", entityId: orderId, summary: { orderNumber: result.orderNumber, ...summary } });
  revalidatePath(ROUTES.admin.orders, "layout");
  revalidatePath(ROUTES.admin.dashboard);
  return { ok: true, message };
}

export async function orderAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = orderActionSchema.safeParse(values);
  if (!parsed.success) return INVALID(parsed.error.issues[0]?.message);
  const { orderId, action, note } = parsed.data;

  switch (action) {
    case "confirm_payment":
      return finishOrder(await confirmPayment(orderId), "order.mark_paid", orderId, {}, "Pembayaran dikonfirmasi.");
    case "cancel":
      if (!note) return { ...INVALID("Tuliskan alasan pembatalan."), fieldErrors: { note: "Tuliskan alasan pembatalan." } };
      return finishOrder(await cancelOrder(orderId, note), "order.cancel", orderId, { note }, "Pesanan dibatalkan. Stok dan poin dikembalikan.");
    default:
      return finishOrder(await transitionOrder(orderId, action, staff.id, { note }), `order.${action}`, orderId, { note }, "Status pesanan diperbarui.");
  }
}

export async function shipOrderAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = shipSchema.safeParse(values);
  if (!parsed.success) return { ...INVALID("Periksa kembali data pengiriman."), fieldErrors: fieldErrors(parsed.error.issues) };
  const { orderId, courier, trackingNumber } = parsed.data;
  return finishOrder(
    await transitionOrder(orderId, "ship", staff.id, { courier, trackingNumber }),
    "order.ship",
    orderId,
    { courier, trackingNumber },
    "Pesanan ditandai dikirim.",
  );
}

export async function decideApplicationAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = applicationDecisionSchema.safeParse(values);
  if (!parsed.success) return INVALID(parsed.error.issues[0]?.message);

  const result = await decideApplication(parsed.data.applicationId, staff.id, parsed.data);
  if (!result.ok) {
    return INVALID(result.reason === "invalid_state" ? "Pendaftaran ini sudah diputuskan." : result.reason === "not_found" ? "Pendaftaran tidak ditemukan." : "Keputusan belum dapat disimpan.");
  }
  await recordAudit({
    action: `partner.${parsed.data.decision}`,
    entityType: "reseller_application",
    entityId: parsed.data.applicationId,
    summary: { userId: result.userId, memberType: result.memberType, tierLevel: result.tierLevel },
  });
  revalidatePath(ROUTES.admin.resellers);
  return { ok: true, message: parsed.data.decision === "approve" ? "Partner disetujui. Harga partner langsung berlaku." : "Pendaftaran ditolak." };
}

export async function updatePartnerAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = partnerUpdateSchema.safeParse(values);
  if (!parsed.success) return INVALID(parsed.error.issues[0]?.message);
  const { userId, isActive, tierLevel } = parsed.data;

  const before = await updatePartner(userId, isActive, tierLevel);
  if (!before) return INVALID("Partner belum dapat diperbarui.");
  await recordAudit({ action: "partner.update", entityType: "partner_account", entityId: userId, summary: { before, after: { isActive, tierLevel } } });
  revalidatePath(ROUTES.admin.resellers);
  return { ok: true, message: "Partner diperbarui." };
}

export async function decideKnowledgeAction(values: unknown): Promise<AdminActionResult> {
  const staff = await authorizeStaff();
  if (!staff) return DENIED;
  const parsed = knowledgeDecisionSchema.safeParse(values);
  if (!parsed.success) return INVALID(parsed.error.issues[0]?.message);

  const result = await decideKnowledge(parsed.data.id, parsed.data.decision);
  if (!result) return INVALID("Status dokumen belum dapat disimpan.");
  await recordAudit({ action: `knowledge.${parsed.data.decision}`, entityType: "knowledge_document", entityId: parsed.data.id, summary: result });
  revalidatePath(ROUTES.admin.knowledge);
  return { ok: true, message: result.to === "approved" ? "Dokumen disetujui dan dipakai oleh Beauty AI." : "Status dokumen diperbarui." };
}
