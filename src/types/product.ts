export type Money = {
  /** Whole rupiah, as returned by the backend. */
  amount: number;
  currency: "IDR";
};

export type ProductImage = {
  src: string;
  alt: string;
};

export type NamedLink = { slug: string; name: string };

/** Product detail view model. Gated copy only contains approved text. */
export type ProductDetail = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription?: string;
  price: Money;
  compareAtPrice?: Money;
  availability: "in_stock" | "out_of_stock";
  size?: string;
  texture?: string;
  howToUse?: string;
  routineTime?: "am" | "pm" | "both";
  routineStep?: string;
  bpomNumber?: string;
  fullIngredients?: string;
  rating?: { average: number; count: number };
  category?: NamedLink & { id: string };
  images: ProductImage[];
  ingredients: { name: string; benefit?: string; concentration?: string; isKey: boolean }[];
  concerns: NamedLink[];
  skinTypes: NamedLink[];
  copy: {
    description?: string;
    positioning?: string;
    benefits: { title: string; body?: string }[];
    faqs: { question: string; answer: string }[];
  };
};

export type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  title?: string;
  body: string;
  skinType?: string;
  verifiedPurchase: boolean;
  /** ISO 8601 */
  createdAt: string;
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
