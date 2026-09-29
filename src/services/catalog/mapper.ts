import type { Database } from "@/types/database";
import type { ProductCardData } from "@/types/product";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ImageRow = Pick<Database["public"]["Tables"]["product_images"]["Row"], "url" | "alt" | "sort_order">;

export type ProductCardRow = Pick<
  ProductRow,
  "slug" | "name" | "short_description" | "price" | "compare_price" | "stock" | "rating_avg" | "review_count" | "thumbnail_url"
> & { product_images: ImageRow[] | null };

/** Columns selected for product cards; keep in sync with ProductCardRow. */
export const PRODUCT_CARD_COLUMNS =
  "slug, name, short_description, price, compare_price, stock, rating_avg, review_count, thumbnail_url, product_images(url, alt, sort_order)";

/**
 * Only images served from this project's public Storage are used. Other
 * values (e.g. relative paths left over from an earlier site) would 404, so
 * they fall back to the card placeholder instead of a broken image.
 */
export function resolveImageUrl(url: string | null | undefined, supabaseUrl: string | undefined): string | null {
  if (!url || !supabaseUrl) return null;
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/`;
  return url.startsWith(prefix) ? url : null;
}

export function toProductCard(row: ProductCardRow, supabaseUrl: string | undefined): ProductCardData {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const candidates = [
    row.thumbnail_url ? { url: row.thumbnail_url, alt: images[0]?.alt ?? row.name } : null,
    ...images.map((image) => ({ url: image.url, alt: image.alt })),
  ];
  const image = candidates
    .map((candidate) => (candidate ? { src: resolveImageUrl(candidate.url, supabaseUrl), alt: candidate.alt } : null))
    .find((candidate) => candidate?.src);

  return {
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description ?? undefined,
    price: { amount: row.price, currency: "IDR" },
    compareAtPrice:
      row.compare_price !== null && row.compare_price > row.price
        ? { amount: row.compare_price, currency: "IDR" }
        : undefined,
    rating: row.review_count > 0 ? { average: Number(row.rating_avg), count: row.review_count } : undefined,
    availability: row.stock > 0 ? "in_stock" : "out_of_stock",
    image: image?.src ? { src: image.src, alt: image.alt } : undefined,
  };
}
