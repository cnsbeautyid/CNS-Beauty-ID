export type Money = {
  /** Whole rupiah, as returned by the backend. */
  amount: number;
  currency: "IDR";
};

export type ProductImage = {
  src: string;
  alt: string;
};

/** View model for product cards. Built by the catalog service (Phase 4). */
export type ProductCardData = {
  slug: string;
  name: string;
  shortDescription?: string;
  price: Money;
  compareAtPrice?: Money;
  rating?: { average: number; count: number };
  /** From backend stock; never inferred in the UI. */
  availability?: "in_stock" | "out_of_stock";
  /** Only APPROVED + PUBLISHED badge copy may be passed here. */
  badge?: string;
  image?: ProductImage;
};
