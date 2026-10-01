// Catalog option lists with no dependencies: client components (the sort
// control) import these, so this module must not pull in Zod.

export const SORT_OPTIONS = [
  { id: "featured", label: "Rekomendasi" },
  { id: "newest", label: "Terbaru" },
  { id: "price-asc", label: "Harga terendah" },
  { id: "price-desc", label: "Harga tertinggi" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];

export const PRICE_RANGES = [
  { id: "under-100k", label: "Di bawah Rp100.000", max: 99_999 },
  { id: "100k-250k", label: "Rp100.000 – Rp250.000", min: 100_000, max: 250_000 },
  { id: "over-250k", label: "Di atas Rp250.000", min: 250_001 },
] as const satisfies readonly { id: string; label: string; min?: number; max?: number }[];

export type PriceRangeId = (typeof PRICE_RANGES)[number]["id"];

export const PAGE_SIZE = 24;
