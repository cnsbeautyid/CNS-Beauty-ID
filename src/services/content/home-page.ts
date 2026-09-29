import "server-only";

import type { HomePageData } from "@/types/content";

/**
 * Dynamic homepage data. Each source is connected in its own phase; until
 * then it returns an empty list and the matching section is not rendered,
 * so the homepage never shows invented products, reviews or articles.
 */
export async function getHomePageData(): Promise<HomePageData> {
  return {
    // Phase 4: concerns with at least one active product (product_concerns).
    concerns: [],
    // Phase 4: active products selected as featured by the catalog service.
    featuredProducts: [],
    // Published, moderated reviews only (reviews.is_published = true).
    testimonials: [],
    // Journal phase: published content_articles.
    articles: [],
  };
}
