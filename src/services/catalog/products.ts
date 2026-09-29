import "server-only";

import { cache } from "react";

import { clientEnv } from "@/lib/env/client";
import { createPublicClient } from "@/lib/supabase/public";
import type { ProductCardData } from "@/types/product";

import { PRODUCT_CARD_COLUMNS, resolveImageUrl, toProductCard } from "./mapper";
import { PAGE_SIZE, priceRange, type CatalogQuery } from "./query";

type Db = NonNullable<ReturnType<typeof createPublicClient>>;

export type CatalogListing =
  | { status: "ok"; products: ProductCardData[]; total: number; page: number; pageCount: number }
  | { status: "unavailable" }
  | { status: "error" };

export type CatalogFacet = { slug: string; name: string };
export type CatalogFacets = {
  categories: (CatalogFacet & { id: string; kind: string })[];
  concerns: CatalogFacet[];
  skinTypes: CatalogFacet[];
};

const LISTING_COLUMNS = `id, ${PRODUCT_CARD_COLUMNS}` as const;
const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;

function intersect(current: string[] | null, next: string[]): string[] {
  return current === null ? next : current.filter((id) => next.includes(id));
}

/** Product ids matching `q`, best match first (public.search_catalog). */
async function searchProductIds(db: Db, q: string): Promise<string[]> {
  const { data, error } = await db.rpc("search_catalog", { p_query: q, p_limit: 50 });
  if (error) throw error;
  return data.filter((row) => row.kind === "product").map((row) => row.id);
}

async function productIdsForCategory(db: Db, categoryId: string): Promise<string[]> {
  const [linked, primary] = await Promise.all([
    db.from("product_categories").select("product_id").eq("category_id", categoryId),
    db.from("products").select("id").eq("primary_category_id", categoryId),
  ]);
  if (linked.error) throw linked.error;
  if (primary.error) throw primary.error;
  return [...new Set([...linked.data.map((row) => row.product_id), ...primary.data.map((row) => row.id)])];
}

async function productIdsForConcern(db: Db, slug: string): Promise<string[]> {
  const { data, error } = await db.from("product_concerns").select("product_id, concerns!inner(slug)").eq("concerns.slug", slug);
  if (error) throw error;
  return data.map((row) => row.product_id);
}

async function productIdsForSkinType(db: Db, slug: string): Promise<string[]> {
  const { data, error } = await db
    .from("product_skin_types")
    .select("product_id, skin_types!inner(slug)")
    .eq("skin_types.slug", slug);
  if (error) throw error;
  return data.map((row) => row.product_id);
}

/**
 * Active products matching the catalog query. Prices, stock and ratings come
 * straight from the database; RLS limits results to published products.
 */
export async function listProducts(query: CatalogQuery, options: { categoryId?: string } = {}): Promise<CatalogListing> {
  const db = createPublicClient();
  if (!db) return { status: "unavailable" };

  const page = query.halaman;
  const empty: CatalogListing = { status: "ok", products: [], total: 0, page, pageCount: 1 };

  try {
    let ids: string[] | null = null;
    let relevance: string[] | null = null;

    if (query.q) {
      relevance = await searchProductIds(db, query.q);
      ids = relevance;
    }
    if (options.categoryId) ids = intersect(ids, await productIdsForCategory(db, options.categoryId));
    if (query.kebutuhan) ids = intersect(ids, await productIdsForConcern(db, query.kebutuhan));
    if (query.kulit) ids = intersect(ids, await productIdsForSkinType(db, query.kulit));
    if (ids?.length === 0) return empty;

    let request = db.from("products").select(LISTING_COLUMNS, { count: "exact" }).eq("status", "active");
    if (ids) request = request.in("id", ids);

    const range = priceRange(query.harga);
    if (range && "min" in range) request = request.gte("price", range.min);
    if (range && "max" in range) request = request.lte("price", range.max);

    switch (query.urut) {
      case "newest":
        request = request.order("created_at", { ascending: false });
        break;
      case "price-asc":
        request = request.order("price", { ascending: true }).order("name");
        break;
      case "price-desc":
        request = request.order("price", { ascending: false }).order("name");
        break;
      default:
        request = request
          .order("is_featured", { ascending: false })
          .order("popularity_score", { ascending: false })
          .order("name");
    }

    // A search with the default sort is ordered by relevance, which only the
    // RPC knows; there are at most 50 matches, so order and page in memory.
    const byRelevance = relevance !== null && query.urut === "featured";
    const from = (page - 1) * PAGE_SIZE;
    if (!byRelevance) request = request.range(from, from + PAGE_SIZE - 1);

    const { data, error, count } = await request;
    if (error) throw error;

    const rows = byRelevance
      ? [...data].sort((a, b) => relevance!.indexOf(a.id) - relevance!.indexOf(b.id)).slice(from, from + PAGE_SIZE)
      : data;
    const total = count ?? rows.length;

    return {
      status: "ok",
      products: rows.map((row) => toProductCard(row, supabaseUrl)),
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  } catch (error) {
    console.error("[catalog] listProducts failed", error);
    return { status: "error" };
  }
}

/** Featured active products for the homepage. Empty on any failure. */
export async function getFeaturedProducts(limit = 4): Promise<ProductCardData[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("popularity_score", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[catalog] getFeaturedProducts failed", error);
    return [];
  }
  return data.map((row) => toProductCard(row, supabaseUrl));
}

/** Visible categories, concerns and skin types for filters. Null on failure. */
export const getCatalogFacets = cache(async (): Promise<CatalogFacets | null> => {
  const db = createPublicClient();
  if (!db) return null;
  const [categories, concerns, skinTypes] = await Promise.all([
    db.from("categories").select("id, slug, name, kind").eq("is_visible", true).order("sort_order"),
    db.from("concerns").select("slug, name").eq("is_visible", true).order("sort_order"),
    db.from("skin_types").select("slug, name").order("sort_order"),
  ]);
  const failed = categories.error ?? concerns.error ?? skinTypes.error;
  if (failed) {
    console.error("[catalog] getCatalogFacets failed", failed);
    return null;
  }
  return { categories: categories.data ?? [], concerns: concerns.data ?? [], skinTypes: skinTypes.data ?? [] };
});

export type ProductSummary = { id: string; slug: string; name: string; image?: { src: string; alt: string } };

/** Names/images for cart rows (including ones the quote rejected). Active only (RLS). */
export async function getProductSummaries(ids: readonly string[]): Promise<Map<string, ProductSummary>> {
  const summaries = new Map<string, ProductSummary>();
  const db = createPublicClient();
  if (!db || ids.length === 0) return summaries;
  const { data, error } = await db.from("products").select("id, slug, name, thumbnail_url").in("id", [...ids]);
  if (error) {
    console.error("[catalog] getProductSummaries failed", error);
    return summaries;
  }
  for (const row of data) {
    const src = resolveImageUrl(row.thumbnail_url, supabaseUrl);
    summaries.set(row.id, { id: row.id, slug: row.slug, name: row.name, image: src ? { src, alt: row.name } : undefined });
  }
  return summaries;
}

export async function getCategoryBySlug(slug: string) {
  const facets = await getCatalogFacets();
  return facets?.categories.find((category) => category.slug === slug) ?? null;
}
