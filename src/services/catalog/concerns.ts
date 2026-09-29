import "server-only";

import type { SkinConcern } from "@/types/content";

/**
 * Skin concerns that have at least one active product mapped to them
 * (product_concerns). Empty until the catalog exists (Phase 4).
 */
export async function getMappedConcerns(): Promise<SkinConcern[]> {
  return [];
}
