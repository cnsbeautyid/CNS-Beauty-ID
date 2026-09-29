import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import type { SkinConcern } from "@/types/content";

/**
 * Visible skin concerns that have at least one active product mapped to them
 * (product_concerns), with the product count. Empty when unavailable.
 */
export async function getMappedConcerns(): Promise<SkinConcern[]> {
  const db = createPublicClient();
  if (!db) return [];

  const { data, error } = await db
    .from("product_concerns")
    .select("product_id, products!inner(status), concerns!inner(slug, name, short_description, sort_order, is_visible)")
    .eq("products.status", "active")
    .eq("concerns.is_visible", true);

  if (error) {
    console.error("[catalog] getMappedConcerns failed", error);
    return [];
  }

  const bySlug = new Map<string, { concern: SkinConcern; sortOrder: number }>();
  for (const row of data) {
    const source = row.concerns;
    const existing = bySlug.get(source.slug);
    if (existing) existing.concern.productCount += 1;
    else
      bySlug.set(source.slug, {
        concern: {
          slug: source.slug,
          label: source.name,
          description: source.short_description ?? undefined,
          productCount: 1,
        },
        sortOrder: source.sort_order,
      });
  }

  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder).map((entry) => entry.concern);
}
