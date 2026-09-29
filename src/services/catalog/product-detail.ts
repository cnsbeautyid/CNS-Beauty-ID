import "server-only";

import { cache } from "react";

import { clientEnv } from "@/lib/env/client";
import { createPublicClient } from "@/lib/supabase/public";
import type { ProductCardData, ProductDetail, ProductReview } from "@/types/product";

import { selectPublicCopy } from "./claims";
import { PRODUCT_CARD_COLUMNS, resolveImageUrl, toProductCard } from "./mapper";

const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;

const DETAIL_COLUMNS = `
  id, slug, sku, name, short_description, description, positioning, price, compare_price, stock,
  size, texture, how_to_use, full_ingredients, routine_time, bpom_number, rating_avg, review_count, thumbnail_url, copy_status,
  category:categories!products_primary_category_id_fkey(id, slug, name, is_visible),
  routine_step:routine_steps!products_routine_step_id_fkey(name),
  product_images(url, alt, sort_order),
  product_benefits(title, body, sort_order, review_status),
  product_faqs(question, answer, sort_order, review_status),
  product_ingredients(concentration, is_key, sort_order, ingredient:ingredients!inner(name, benefit)),
  product_concerns(concern:concerns!inner(slug, name, is_visible, sort_order)),
  product_skin_types(skin_type:skin_types!inner(slug, name, sort_order))
` as const;

const bySortOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export type ProductDetailResult = { status: "ok"; product: ProductDetail } | { status: "not_found" } | { status: "error" };

/** One active product by slug. Unapproved marketing copy is removed (see ./claims). */
export const getProductBySlug = cache(async (slug: string): Promise<ProductDetailResult> => {
  const db = createPublicClient();
  if (!db) return { status: "not_found" };

  const { data: row, error } = await db.from("products").select(DETAIL_COLUMNS).eq("slug", slug).eq("status", "active").maybeSingle();
  if (error) {
    console.error("[catalog] getProductBySlug failed", error);
    return { status: "error" };
  }
  if (!row) return { status: "not_found" };

  const images = [...row.product_images]
    .sort(bySortOrder)
    .map((image) => ({ src: resolveImageUrl(image.url, supabaseUrl), alt: image.alt }))
    .filter((image): image is { src: string; alt: string } => image.src !== null);
  const thumbnail = resolveImageUrl(row.thumbnail_url, supabaseUrl);
  if (thumbnail && !images.some((image) => image.src === thumbnail)) images.unshift({ src: thumbnail, alt: row.name });

  const product: ProductDetail = {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    shortDescription: row.short_description ?? undefined,
    price: { amount: row.price, currency: "IDR" },
    compareAtPrice:
      row.compare_price !== null && row.compare_price > row.price ? { amount: row.compare_price, currency: "IDR" } : undefined,
    availability: row.stock > 0 ? "in_stock" : "out_of_stock",
    size: row.size ?? undefined,
    texture: row.texture ?? undefined,
    howToUse: row.how_to_use ?? undefined,
    routineTime: row.routine_time ?? undefined,
    routineStep: row.routine_step?.name,
    bpomNumber: row.bpom_number ?? undefined,
    fullIngredients: row.full_ingredients ?? undefined,
    rating: row.review_count > 0 ? { average: Number(row.rating_avg), count: row.review_count } : undefined,
    category: row.category?.is_visible ? { id: row.category.id, slug: row.category.slug, name: row.category.name } : undefined,
    images,
    // RLS + !inner: only ingredients with status = approved are returned.
    ingredients: [...row.product_ingredients].sort(bySortOrder).map((item) => ({
      name: item.ingredient.name,
      benefit: item.ingredient.benefit ?? undefined,
      concentration: item.concentration ?? undefined,
      isKey: item.is_key,
    })),
    concerns: row.product_concerns
      .map((item) => item.concern)
      .filter((concern) => concern.is_visible)
      .sort(bySortOrder)
      .map(({ slug: s, name }) => ({ slug: s, name })),
    skinTypes: row.product_skin_types
      .map((item) => item.skin_type)
      .sort(bySortOrder)
      .map(({ slug: s, name }) => ({ slug: s, name })),
    copy: selectPublicCopy({
      copyStatus: row.copy_status,
      description: row.description,
      positioning: row.positioning,
      benefits: [...row.product_benefits].sort(bySortOrder),
      faqs: [...row.product_faqs].sort(bySortOrder),
    }),
  };

  return { status: "ok", product };
});

/** Active related products (product_relations), in configured order. */
export async function getRelatedProducts(productId: string, limit = 4): Promise<ProductCardData[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("product_relations")
    .select(`sort_order, related:products!product_relations_related_product_id_fkey(status, ${PRODUCT_CARD_COLUMNS})`)
    .eq("product_id", productId)
    .order("sort_order")
    .limit(limit);
  if (error) {
    console.error("[catalog] getRelatedProducts failed", error);
    return [];
  }
  return data.flatMap((row) => (row.related && row.related.status === "active" ? [toProductCard(row.related, supabaseUrl)] : []));
}

/** Moderated reviews only (RLS: status = approved), newest first. */
export async function getApprovedReviews(productId: string, limit = 6): Promise<ProductReview[] | null> {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("reviews")
    .select("id, author_name, rating, title, body, skin_type, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[catalog] getApprovedReviews failed", error);
    return null;
  }
  return data.map((review) => ({
    id: review.id,
    authorName: review.author_name,
    rating: review.rating,
    title: review.title ?? undefined,
    body: review.body,
    skinType: review.skin_type ?? undefined,
    verifiedPurchase: review.is_verified_purchase,
    createdAt: review.created_at,
  }));
}

/** Slugs of active products, for static generation. */
export async function getActiveProductSlugs(): Promise<string[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db.from("products").select("slug").eq("status", "active");
  if (error) {
    console.error("[catalog] getActiveProductSlugs failed", error);
    return [];
  }
  return data.map((row) => row.slug);
}
