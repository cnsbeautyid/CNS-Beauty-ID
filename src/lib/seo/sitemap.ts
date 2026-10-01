import type { MetadataRoute } from "next";

import { productCategoryPath, productPath, ROUTES } from "@/constants/routes";

export type SitemapInput = {
  siteUrl: string;
  /** null when the catalog couldn't be read: the fixed pages are still served. */
  products: { slug: string; updatedAt: string; image?: string }[] | null;
  categories: { slug: string }[] | null;
  hasTestimonials: boolean;
  hasFaqs: boolean;
};

type Entry = MetadataRoute.Sitemap[number];

const FIXED: { path: string; changeFrequency: Entry["changeFrequency"]; priority: number }[] = [
  { path: ROUTES.home, changeFrequency: "weekly", priority: 1 },
  { path: ROUTES.products, changeFrequency: "daily", priority: 0.9 },
  { path: ROUTES.beautyConcierge, changeFrequency: "monthly", priority: 0.7 },
  { path: ROUTES.skinQuiz, changeFrequency: "monthly", priority: 0.7 },
  { path: ROUTES.about, changeFrequency: "monthly", priority: 0.6 },
  { path: ROUTES.benefits, changeFrequency: "monthly", priority: 0.6 },
  { path: ROUTES.resellerProgram, changeFrequency: "monthly", priority: 0.5 },
  { path: ROUTES.contact, changeFrequency: "monthly", priority: 0.5 },
  { path: ROUTES.privacy, changeFrequency: "yearly", priority: 0.2 },
];

export function buildSitemap(input: SitemapInput): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, input.siteUrl).toString();
  const entries: MetadataRoute.Sitemap = FIXED.map((page) => ({ url: url(page.path), changeFrequency: page.changeFrequency, priority: page.priority }));
  // These pages are noindex while empty, so they are listed only with content.
  if (input.hasTestimonials) entries.push({ url: url(ROUTES.testimonials), changeFrequency: "weekly", priority: 0.5 });
  if (input.hasFaqs) entries.push({ url: url(ROUTES.faq), changeFrequency: "monthly", priority: 0.5 });
  for (const category of input.categories ?? []) {
    entries.push({ url: url(productCategoryPath(category.slug)), changeFrequency: "weekly", priority: 0.7 });
  }
  for (const product of input.products ?? []) {
    entries.push({
      url: url(productPath(product.slug)),
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(product.image && { images: [product.image] }),
    });
  }
  return entries;
}
