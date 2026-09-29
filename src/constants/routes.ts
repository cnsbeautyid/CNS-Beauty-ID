// Canonical route map. Customer-facing SEO URLs are Indonesian
// (/produk/[slug], /artikel/[slug]); authenticated areas keep English paths.
// Pages are built phase by phase; see docs/ARCHITECTURE.md §4.

export const ROUTES = {
  home: "/",

  // Brand
  about: "/tentang-kami",
  benefits: "/manfaat",
  testimonials: "/testimoni",
  contact: "/kontak",
  faq: "/faq",
  resellerProgram: "/reseller",

  // Catalog
  products: "/produk",
  bundles: "/paket",
  journal: "/artikel",

  // AI
  beautyConcierge: "/beauty-concierge",
  skinQuiz: "/skin-quiz",

  // Commerce
  cart: "/cart",
  checkout: "/checkout",

  // Customer account
  account: {
    dashboard: "/account",
    orders: "/account/orders",
    wishlist: "/account/wishlist",
    loyalty: "/account/loyalty",
    skinProfile: "/account/skin-profile",
    routine: "/account/routine",
    settings: "/account/settings",
  },

  // Reseller portal (separate from the public /reseller program page)
  resellerPortal: {
    dashboard: "/reseller-portal",
    products: "/reseller-portal/products",
    orders: "/reseller-portal/orders",
    customers: "/reseller-portal/customers",
    commission: "/reseller-portal/commission",
    marketing: "/reseller-portal/marketing",
    ai: "/reseller-portal/ai",
  },

  admin: {
    dashboard: "/admin",
    products: "/admin/products",
    inventory: "/admin/inventory",
    orders: "/admin/orders",
    customers: "/admin/customers",
    resellers: "/admin/resellers",
    ai: "/admin/ai",
    knowledge: "/admin/knowledge",
    content: "/admin/content",
    analytics: "/admin/analytics",
    auditLog: "/admin/audit-log",
  },
} as const;

const segment = (slug: string) => encodeURIComponent(slug.trim().toLowerCase());

export const productPath = (slug: string) => `${ROUTES.products}/${segment(slug)}`;
export const productCategoryPath = (slug: string) => `${ROUTES.products}/kategori/${segment(slug)}`;
export const articlePath = (slug: string) => `${ROUTES.journal}/${segment(slug)}`;
export const orderPath = (orderNumber: string) =>
  `${ROUTES.account.orders}/${encodeURIComponent(orderNumber)}`;
