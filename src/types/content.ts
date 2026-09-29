import type { ProductCardData, ProductImage } from "./product";

/** A skin concern with at least one active product mapped to it (product_concerns). */
export type SkinConcern = {
  slug: string;
  label: string;
  description?: string;
  productCount: number;
};

/** A published, moderated customer review. Never written by us. */
export type Testimonial = {
  id: string;
  quote: string;
  authorName: string;
  productName?: string;
  verifiedPurchase: boolean;
};

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  /** ISO 8601, e.g. "2026-10-01T09:00:00+07:00". */
  publishedAt: string;
  cover?: ProductImage;
};

export type HomePageData = {
  concerns: SkinConcern[];
  featuredProducts: ProductCardData[];
  testimonials: Testimonial[];
  articles: ArticleSummary[];
};
