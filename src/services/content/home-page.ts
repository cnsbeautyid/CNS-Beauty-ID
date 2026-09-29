import "server-only";

import { getMappedConcerns } from "@/services/catalog/concerns";
import type { HomePageData } from "@/types/content";

import { getPublishedTestimonials } from "./testimonials";

/**
 * Dynamic homepage data. Each source is connected in its own phase; until
 * then it returns an empty list and the matching section is not rendered,
 * so the homepage never shows invented products, reviews or articles.
 */
export async function getHomePageData(): Promise<HomePageData> {
  const [concerns, testimonials] = await Promise.all([getMappedConcerns(), getPublishedTestimonials({ limit: 3 })]);

  return {
    concerns,
    // Phase 4: active products selected as featured by the catalog service.
    featuredProducts: [],
    testimonials,
    // Journal phase: published content_articles.
    articles: [],
  };
}
