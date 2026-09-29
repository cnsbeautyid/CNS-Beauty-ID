import type { ArticleSummary, SkinConcern, Testimonial } from "@/types/content";
import type { ProductCardData } from "@/types/product";

// SAMPLE DATA for previewing data-driven homepage sections. Not real
// concerns, reviews or articles.
export const SAMPLE_CONCERNS: readonly SkinConcern[] = [
  { slug: "contoh-kusam", label: "Contoh Kategori A", description: "Deskripsi singkat kebutuhan kulit.", productCount: 2 },
  { slug: "contoh-kering", label: "Contoh Kategori B", productCount: 1 },
  { slug: "contoh-sensitif", label: "Contoh Kategori C", description: "Deskripsi kedua.", productCount: 3 },
];

export const SAMPLE_TESTIMONIALS: readonly Testimonial[] = [
  { id: "t1", quote: "Contoh testimoni untuk menguji tata letak kartu.", authorName: "Pelanggan Contoh", verifiedPurchase: true },
  {
    id: "t2",
    quote: "Contoh testimoni kedua yang sedikit lebih panjang untuk melihat perilaku teks.",
    authorName: "Pelanggan Contoh 2",
    productName: "Produk Contoh A",
    verifiedPurchase: false,
  },
];

export const SAMPLE_ARTICLES: readonly ArticleSummary[] = [
  { slug: "artikel-contoh-a", title: "Artikel Contoh A", excerpt: "Ringkasan artikel contoh.", category: "Contoh", publishedAt: "2026-10-01T09:00:00+07:00" },
  { slug: "artikel-contoh-b", title: "Artikel Contoh B dengan Judul Lebih Panjang", publishedAt: "2026-09-15T09:00:00+07:00" },
];

// SAMPLE DATA for the internal design-system preview only. These are not CNS
// Beauty products, prices or ratings and must never be used elsewhere.
export const SAMPLE_PRODUCTS: readonly ProductCardData[] = [
  {
    slug: "produk-contoh-a",
    name: "Produk Contoh A",
    shortDescription: "Deskripsi singkat contoh untuk menguji tata letak dua baris pada kartu produk.",
    price: { amount: 150000, currency: "IDR" },
    rating: { average: 4.6, count: 24 },
    badge: "Contoh",
  },
  {
    slug: "produk-contoh-b",
    name: "Produk Contoh B dengan Nama yang Lebih Panjang",
    shortDescription: "Menguji judul panjang dan harga coret.",
    price: { amount: 99000, currency: "IDR" },
    compareAtPrice: { amount: 129000, currency: "IDR" },
  },
  {
    slug: "produk-contoh-c",
    name: "Produk Contoh C",
    price: { amount: 245000, currency: "IDR" },
    rating: { average: 3.2, count: 5 },
  },
  {
    slug: "produk-contoh-d",
    name: "Produk Contoh D",
    shortDescription: "Tanpa rating: kartu tidak menampilkan bintang.",
    price: { amount: 75000, currency: "IDR" },
  },
];

export const SWATCHES = [
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "surface", className: "bg-surface" },
  { name: "border", className: "bg-border" },
  { name: "text-secondary", className: "bg-text-secondary" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "error", className: "bg-error" },
  { name: "ai-surface", className: "bg-ai-surface" },
  { name: "ai-accent", className: "bg-ai-accent" },
  { name: "brand-cocoa", className: "bg-brand-cocoa" },
  { name: "brand-cocoa-dark", className: "bg-brand-cocoa-dark" },
  { name: "brand-blush", className: "bg-brand-blush" },
  { name: "brand-blush-soft", className: "bg-brand-blush-soft" },
  { name: "brand-peach", className: "bg-brand-peach" },
  { name: "brand-cream", className: "bg-brand-cream" },
  { name: "brand-ivory", className: "bg-brand-ivory" },
  { name: "brand-beige", className: "bg-brand-beige" },
  { name: "brand-gold", className: "bg-brand-gold" },
  { name: "brand-rose-gold", className: "bg-brand-rose-gold" },
] as const;

export const TYPE_SCALE = [
  { name: "display-xl", className: "font-display text-display-xl" },
  { name: "display-l", className: "font-display text-display-l" },
  { name: "h1", className: "font-display text-h1" },
  { name: "h2", className: "font-display text-h2" },
  { name: "h3", className: "font-display text-h3" },
  { name: "h4", className: "font-display text-h4" },
  { name: "body-l", className: "text-body-l" },
  { name: "body", className: "text-body" },
  { name: "body-s", className: "text-body-s" },
  { name: "caption", className: "text-caption" },
] as const;
