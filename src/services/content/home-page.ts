import "server-only";

import { getMappedConcerns } from "@/services/catalog/concerns";
import { getFeaturedProducts } from "@/services/catalog/products";
import type { HomePageData } from "@/types/content";

import { getPublishedTestimonials } from "./testimonials";

/**
 * Dynamic homepage data. Each source is connected in its own phase; until
 * then it returns an empty list and the matching section is not rendered,
 * so the homepage never shows invented products, reviews or articles.
 */
export async function getHomePageData(): Promise<HomePageData> {
  const [concerns, featuredProducts, testimonials] = await Promise.all([
    getMappedConcerns(),
    getFeaturedProducts(4),
    getPublishedTestimonials({ limit: 3 }),
  ]);

  return {
    concerns,
    featuredProducts,
    testimonials,
    // Journal phase: published content_articles.
    articles: [],
  };
}
