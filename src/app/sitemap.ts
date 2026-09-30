import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env/client";
import { buildSitemap } from "@/lib/seo/sitemap";
import { getCatalogFacets, listSitemapProducts } from "@/services/catalog/products";
import { getPublicFaqs } from "@/services/content/faqs";
import { getPublishedTestimonials } from "@/services/content/testimonials";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, facets, testimonials, faqs] = await Promise.all([
    listSitemapProducts(),
    getCatalogFacets(),
    getPublishedTestimonials({ limit: 1 }),
    getPublicFaqs().catch(() => null),
  ]);
  return buildSitemap({
    siteUrl: clientEnv.NEXT_PUBLIC_SITE_URL,
    products,
    categories: facets?.categories ?? null,
    hasTestimonials: testimonials.length > 0,
    hasFaqs: (faqs ?? []).length > 0,
  });
}
