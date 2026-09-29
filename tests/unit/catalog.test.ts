import { describe, expect, it } from "vitest";

import { resolveImageUrl, toProductCard, type ProductCardRow } from "@/services/catalog/mapper";
import { buildCatalogHref, hasActiveFilters, parseCatalogQuery, priceRange } from "@/services/catalog/query";

const SUPABASE = "https://project.supabase.co";
const storage = (path: string) => `${SUPABASE}/storage/v1/object/public/catalog/${path}`;

const row = (overrides: Partial<ProductCardRow> = {}): ProductCardRow => ({
  slug: "sample",
  name: "Sample Product",
  short_description: "Short",
  price: 150000,
  compare_price: null,
  stock: 3,
  rating_avg: 0,
  review_count: 0,
  thumbnail_url: null,
  product_images: [],
  ...overrides,
});

describe("parseCatalogQuery", () => {
  it("defaults to the featured sort on page 1", () => {
    expect(parseCatalogQuery({})).toEqual({
      q: undefined,
      kebutuhan: undefined,
      kulit: undefined,
      harga: undefined,
      urut: "featured",
      halaman: 1,
    });
  });

  it("accepts valid values and takes the first of repeated params", () => {
    const query = parseCatalogQuery({
      q: "  serum   licorice ",
      kebutuhan: ["dull-skin", "dry-skin"],
      kulit: "sensitive",
      harga: "100k-250k",
      urut: "price-asc",
      halaman: "2",
    });
    expect(query).toMatchObject({
      q: "serum licorice",
      kebutuhan: "dull-skin",
      kulit: "sensitive",
      harga: "100k-250k",
      urut: "price-asc",
      halaman: 2,
    });
  });

  it("drops tampered values instead of failing", () => {
    const query = parseCatalogQuery({
      q: "   ",
      kebutuhan: "DROP TABLE",
      kulit: "../etc",
      harga: "free",
      urut: "hack",
      halaman: "-5",
    });
    expect(query).toMatchObject({ q: undefined, kebutuhan: undefined, kulit: undefined, harga: undefined, urut: "featured", halaman: 1 });
  });

  it("caps search length and page number", () => {
    expect(parseCatalogQuery({ q: "a".repeat(300) }).q).toHaveLength(100);
    expect(parseCatalogQuery({ halaman: "9999" }).halaman).toBe(1);
  });
});

describe("buildCatalogHref", () => {
  const query = parseCatalogQuery({ q: "glow", kebutuhan: "dull-skin", halaman: "3" });

  it("applies a patch and resets the page", () => {
    expect(buildCatalogHref("/produk", query, { kulit: "dry" })).toBe("/produk?q=glow&kebutuhan=dull-skin&kulit=dry");
  });

  it("removes keys patched to undefined", () => {
    expect(buildCatalogHref("/produk", query, { kebutuhan: undefined })).toBe("/produk?q=glow");
  });

  it("omits defaults and keeps an explicit page", () => {
    expect(buildCatalogHref("/produk", {}, { urut: "featured" })).toBe("/produk");
    expect(buildCatalogHref("/produk", query, { halaman: 2 })).toBe("/produk?q=glow&kebutuhan=dull-skin&halaman=2");
  });

  it("encodes values", () => {
    expect(buildCatalogHref("/produk", {}, { q: "a&b c" })).toBe("/produk?q=a%26b+c");
  });
});

describe("filters", () => {
  it("knows price ranges and active state", () => {
    expect(priceRange("under-100k")).toMatchObject({ max: 99_999 });
    expect(priceRange(undefined)).toBeUndefined();
    expect(hasActiveFilters(parseCatalogQuery({ urut: "newest" }))).toBe(false);
    expect(hasActiveFilters(parseCatalogQuery({ harga: "over-250k" }))).toBe(true);
  });
});

describe("resolveImageUrl", () => {
  it("allows only this project's public Storage", () => {
    expect(resolveImageUrl(storage("a.jpg"), SUPABASE)).toBe(storage("a.jpg"));
    expect(resolveImageUrl("/images/products/a.jpg", SUPABASE)).toBeNull();
    expect(resolveImageUrl("https://evil.example/a.jpg", SUPABASE)).toBeNull();
    expect(resolveImageUrl(storage("a.jpg"), undefined)).toBeNull();
  });
});

describe("toProductCard", () => {
  it("maps backend fields without deriving prices", () => {
    expect(toProductCard(row(), SUPABASE)).toEqual({
      slug: "sample",
      name: "Sample Product",
      shortDescription: "Short",
      price: { amount: 150000, currency: "IDR" },
      compareAtPrice: undefined,
      rating: undefined,
      availability: "in_stock",
      image: undefined,
    });
  });

  it("marks zero stock as out of stock", () => {
    expect(toProductCard(row({ stock: 0 }), SUPABASE).availability).toBe("out_of_stock");
  });

  it("shows a compare price only when it is higher", () => {
    expect(toProductCard(row({ compare_price: 200000 }), SUPABASE).compareAtPrice).toEqual({ amount: 200000, currency: "IDR" });
    expect(toProductCard(row({ compare_price: 100000 }), SUPABASE).compareAtPrice).toBeUndefined();
  });

  it("hides ratings without reviews", () => {
    expect(toProductCard(row({ rating_avg: 4.5, review_count: 0 }), SUPABASE).rating).toBeUndefined();
    expect(toProductCard(row({ rating_avg: 4.5, review_count: 8 }), SUPABASE).rating).toEqual({ average: 4.5, count: 8 });
  });

  it("uses the first usable image, skipping unreachable paths", () => {
    const card = toProductCard(
      row({
        thumbnail_url: "/images/legacy.jpg",
        product_images: [
          { url: storage("second.jpg"), alt: "Second", sort_order: 2 },
          { url: storage("first.jpg"), alt: "First", sort_order: 1 },
        ],
      }),
      SUPABASE,
    );
    expect(card.image).toEqual({ src: storage("first.jpg"), alt: "First" });
  });
});
