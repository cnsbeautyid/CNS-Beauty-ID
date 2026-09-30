import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { Json } from "@/types/database";

import type { ProductUpdateInput } from "./model";

// Products, inventory and claim review, as the staff member. The copy/claim
// review triggers stamp the reviewer from auth.uid() and send edited approved
// text back to pending_review; the app never writes reviewer columns itself.

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  lowStockThreshold: number;
  status: string;
  isFeatured: boolean;
  copyStatus: string;
  updatedAt: string;
};

const LIST_COLUMNS = "id, slug, name, sku, price, compare_price, stock, low_stock_threshold, status, is_featured, copy_status, updated_at" as const;

function toRow(row: {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  compare_price: number | null;
  stock: number;
  low_stock_threshold: number;
  status: string;
  is_featured: boolean;
  copy_status: string;
  updated_at: string;
}): AdminProductRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    price: row.price,
    comparePrice: row.compare_price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    status: row.status,
    isFeatured: row.is_featured,
    copyStatus: row.copy_status,
    updatedAt: row.updated_at,
  };
}

/** Every product, any status. Null on failure. */
export async function listAdminProducts(): Promise<AdminProductRow[] | null> {
  const db = await createClient();
  const { data, error } = await db.from("products").select(LIST_COLUMNS).order("name");
  if (error) {
    console.error("[admin] listAdminProducts failed", error);
    return null;
  }
  return (data ?? []).map(toRow);
}

export type ReviewItem = { id: string; title: string; body: string | null; status: string; evidenceReference: string | null; reviewedAt: string | null };

export type AdminProduct = AdminProductRow & {
  description: string | null;
  positioning: string | null;
  copyEvidenceReference: string | null;
  copyReviewedAt: string | null;
  benefits: ReviewItem[];
  faqs: ReviewItem[];
  variants: { id: string; name: string; sku: string; stock: number; price: number }[];
};

export async function getAdminProduct(id: string): Promise<AdminProduct | null | undefined> {
  const db = await createClient();
  const { data, error } = await db
    .from("products")
    .select(
      `${LIST_COLUMNS}, description, positioning, copy_evidence_reference, copy_reviewed_at,
       product_benefits(id, title, body, review_status, evidence_reference, reviewed_at, sort_order),
       product_faqs(id, question, answer, review_status, evidence_reference, reviewed_at, sort_order),
       product_variants(id, name, sku, stock, price, sort_order)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[admin] getAdminProduct failed", error);
    return undefined;
  }
  if (!data) return null;
  const bySort = <T extends { sort_order: number }>(rows: T[]) => [...rows].sort((a, b) => a.sort_order - b.sort_order);
  return {
    ...toRow(data),
    description: data.description,
    positioning: data.positioning,
    copyEvidenceReference: data.copy_evidence_reference,
    copyReviewedAt: data.copy_reviewed_at,
    benefits: bySort(data.product_benefits).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.review_status,
      evidenceReference: row.evidence_reference,
      reviewedAt: row.reviewed_at,
    })),
    faqs: bySort(data.product_faqs).map((row) => ({
      id: row.id,
      title: row.question,
      body: row.answer,
      status: row.review_status,
      evidenceReference: row.evidence_reference,
      reviewedAt: row.reviewed_at,
    })),
    variants: bySort(data.product_variants).map((row) => ({ id: row.id, name: row.name, sku: row.sku, stock: row.stock, price: row.price })),
  };
}

type Changes = Record<string, { from: Json; to: Json }>;

function diff(before: Record<string, Json>, after: Record<string, Json>): Changes {
  const changes: Changes = {};
  for (const [key, value] of Object.entries(after)) if (before[key] !== value) changes[key] = { from: before[key] ?? null, to: value };
  return changes;
}

/** Updates commerce fields. Returns the changed fields (for the audit log), or null on failure / not found. */
export async function updateProduct(input: ProductUpdateInput): Promise<{ name: string; changes: Changes } | null> {
  const db = await createClient();
  const { data: before, error: readError } = await db
    .from("products")
    .select("name, price, compare_price, stock, low_stock_threshold, status, is_featured")
    .eq("id", input.productId)
    .maybeSingle();
  if (readError || !before) {
    if (readError) console.error("[admin] updateProduct read failed", readError);
    return null;
  }
  const next = {
    price: input.price,
    compare_price: input.comparePrice,
    stock: input.stock,
    low_stock_threshold: input.lowStockThreshold,
    status: input.status,
    is_featured: input.isFeatured,
  };
  const { error } = await db.from("products").update(next).eq("id", input.productId);
  if (error) {
    console.error("[admin] updateProduct failed", error);
    return null;
  }
  return { name: before.name, changes: diff(before, next) };
}

/** Sets absolute stock. Returns the previous value, or null on failure / not found. */
export async function setStock(productId: string, stock: number): Promise<{ name: string; from: number } | null> {
  const db = await createClient();
  const { data: before, error: readError } = await db.from("products").select("name, stock").eq("id", productId).maybeSingle();
  if (readError || !before) {
    if (readError) console.error("[admin] setStock read failed", readError);
    return null;
  }
  const { error } = await db.from("products").update({ stock }).eq("id", productId);
  if (error) {
    console.error("[admin] setStock failed", error);
    return null;
  }
  return { name: before.name, from: before.stock };
}

export type ReviewKind = "product_copy" | "benefit" | "faq";

/** Approve or return to draft. Approval is stamped by the DB trigger. Returns the product id, or null on failure. */
export async function reviewContent(kind: ReviewKind, id: string, decision: "approve" | "draft", evidenceReference?: string): Promise<string | null> {
  const db = await createClient();
  const status = decision === "approve" ? "approved" : "draft";
  const result =
    kind === "product_copy"
      ? await db
          .from("products")
          .update({ copy_status: status, ...(evidenceReference !== undefined && { copy_evidence_reference: evidenceReference }) })
          .eq("id", id)
          .select("id")
          .maybeSingle()
      : await db
          .from(kind === "benefit" ? "product_benefits" : "product_faqs")
          .update({ review_status: status, ...(evidenceReference !== undefined && { evidence_reference: evidenceReference }) })
          .eq("id", id)
          .select("product_id")
          .maybeSingle();
  if (result.error || !result.data) {
    if (result.error) console.error("[admin] reviewContent failed", result.error);
    return null;
  }
  return "product_id" in result.data ? result.data.product_id : result.data.id;
}
