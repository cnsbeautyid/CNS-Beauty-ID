// CNS event vocabulary (CLAUDE.md §14, PRD §30). The database CHECK on
// analytics_events.event_name lists the same names; change both together and
// bump ANALYTICS_EVENT_VERSION when a property contract changes.

export const ANALYTICS_EVENT_VERSION = 1;

export const ANALYTICS_EVENTS = [
  "PAGE_VIEWED",
  "PRODUCT_VIEWED",
  "PRODUCT_SEARCHED",
  "PRODUCT_RECOMMENDATION_VIEWED",
  "AI_OPENED",
  "AI_MESSAGE_SENT",
  "AI_RECOMMENDATION_VIEWED",
  "AI_RECOMMENDATION_ACCEPTED",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "CHECKOUT_STARTED",
  "PAYMENT_STARTED",
  "ORDER_CREATED",
  "ORDER_DELIVERED",
  "REVIEW_CREATED",
  "SKIN_QUIZ_STARTED",
  "SKIN_QUIZ_COMPLETED",
  "LOYALTY_VIEWED",
  "VOUCHER_APPLIED",
  "RESELLER_AI_USED",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * Events the browser may send to /api/analytics. Everything else describes a
 * state change and is recorded by the server where that change happens
 * (cart, checkout, payment, fulfilment, AI chat), so it can't be forged.
 */
export const CLIENT_EVENTS = [
  "PAGE_VIEWED",
  "PRODUCT_VIEWED",
  "PRODUCT_SEARCHED",
  "PRODUCT_RECOMMENDATION_VIEWED",
  "AI_OPENED",
  "AI_RECOMMENDATION_VIEWED",
  "AI_RECOMMENDATION_ACCEPTED",
  "CHECKOUT_STARTED",
  "SKIN_QUIZ_STARTED",
  "LOYALTY_VIEWED",
] as const satisfies readonly AnalyticsEventName[];

export type ClientEventName = (typeof CLIENT_EVENTS)[number];

/** PRD §30 primary funnel, as measurable events. */
export const PRIMARY_FUNNEL = ["PAGE_VIEWED", "PRODUCT_VIEWED", "ADD_TO_CART", "CHECKOUT_STARTED", "ORDER_CREATED"] as const satisfies readonly AnalyticsEventName[];

/** PRD §30 AI funnel. */
export const AI_FUNNEL = [
  "AI_OPENED",
  "AI_MESSAGE_SENT",
  "AI_RECOMMENDATION_VIEWED",
  "AI_RECOMMENDATION_ACCEPTED",
  "ADD_TO_CART",
  "ORDER_CREATED",
] as const satisfies readonly AnalyticsEventName[];

export const SKIN_QUIZ_FUNNEL = ["SKIN_QUIZ_STARTED", "SKIN_QUIZ_COMPLETED", "PRODUCT_RECOMMENDATION_VIEWED", "ADD_TO_CART"] as const satisfies readonly AnalyticsEventName[];

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventName, string> = {
  PAGE_VIEWED: "Melihat halaman",
  PRODUCT_VIEWED: "Melihat produk",
  PRODUCT_SEARCHED: "Mencari produk",
  PRODUCT_RECOMMENDATION_VIEWED: "Melihat rekomendasi produk",
  AI_OPENED: "Membuka Beauty AI",
  AI_MESSAGE_SENT: "Mengirim pesan ke AI",
  AI_RECOMMENDATION_VIEWED: "Melihat rekomendasi AI",
  AI_RECOMMENDATION_ACCEPTED: "Memilih rekomendasi AI",
  ADD_TO_CART: "Menambah ke keranjang",
  REMOVE_FROM_CART: "Menghapus dari keranjang",
  CHECKOUT_STARTED: "Mulai checkout",
  PAYMENT_STARTED: "Mengirim bukti bayar",
  ORDER_CREATED: "Membuat pesanan",
  ORDER_DELIVERED: "Pesanan diterima",
  REVIEW_CREATED: "Menulis ulasan",
  SKIN_QUIZ_STARTED: "Mulai Skin Quiz",
  SKIN_QUIZ_COMPLETED: "Menyelesaikan Skin Quiz",
  LOYALTY_VIEWED: "Melihat CNS Rewards",
  VOUCHER_APPLIED: "Memakai kupon",
  RESELLER_AI_USED: "Partner memakai AI",
};

/** First-party anonymous visitor id (shared with the Beauty Concierge). */
export const ANONYMOUS_ID_COOKIE = "cns_aid";
export const ANONYMOUS_ID_MAX_AGE = 60 * 60 * 24 * 365;
