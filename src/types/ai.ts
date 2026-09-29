/**
 * Page context sent with AI requests (PRD §18). Helps the concierge know what
 * the customer is looking at. It is NEVER authorization context: the server
 * resolves identity and permissions independently.
 */
export type AIPageContext = {
  pageType: "home" | "shop" | "product" | "cart" | "checkout" | "account" | "reseller" | "other";
  productId?: string;
  productSlug?: string;
  /** Display only (e.g. "Kamu sedang melihat …"); the server resolves facts by id. */
  productName?: string;
  categoryId?: string;
  orderId?: string;
  campaignId?: string;
};

export type AIQuickAction = {
  id: string;
  label: string;
  /** Message sent when the chip is chosen. */
  prompt: string;
};
