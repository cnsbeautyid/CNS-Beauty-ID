import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const CAP = 1000;
const db = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  error: null as { message: string } | null,
  filters: [] as string[],
}));

vi.mock("@/lib/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_SUPABASE_URL: "https://shop.supabase.co" },
  getSupabasePublicConfig: () => ({ url: "https://shop.supabase.co", publishableKey: "pk" }),
}));
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          db.filters.push(`${table}.${column}=${String(value)}`);
          return query;
        },
        order: () => query,
        range: async (from: number, to: number) =>
          db.error ? { data: null, error: db.error } : { data: (db.tables[table] ?? []).slice(from, Math.min(to + 1, from + CAP)), error: null },
      };
      return query;
    },
  }),
}));

import { listSitemapProducts } from "@/services/catalog/products";
import { getPublicFaqs, groupFaqs } from "@/services/content/faqs";

describe("listSitemapProducts", () => {
  beforeEach(() => {
    db.error = null;
    db.filters = [];
    db.tables.products = Array.from({ length: 1500 }, (_, index) => ({
      slug: `produk-${index}`,
      updated_at: "2026-09-20T10:00:00Z",
      thumbnail_url: index === 0 ? "https://shop.supabase.co/storage/v1/object/public/products/a.webp" : "/old/relative.jpg",
    }));
  });

  it("reads every active product past the 1000-row cap, keeping only shop-storage images", async () => {
    const products = await listSitemapProducts();
    expect(products).toHaveLength(1500);
    expect(db.filters).toContain("products.status=active");
    expect(products?.[0]).toEqual({ slug: "produk-0", updatedAt: "2026-09-20T10:00:00Z", image: "https://shop.supabase.co/storage/v1/object/public/products/a.webp" });
    expect(products?.[1]).toEqual({ slug: "produk-1", updatedAt: "2026-09-20T10:00:00Z" });
  });

  it("returns null when the catalog can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.error = { message: "down" };
    expect(await listSitemapProducts()).toBeNull();
  });
});

describe("getPublicFaqs", () => {
  beforeEach(() => {
    db.error = null;
    db.filters = [];
    db.tables.faqs = [
      { id: "1", question: "Q shipping", answer: "A1", topic: "shipping", sort_order: 1 },
      { id: "2", question: "Q product", answer: "A2", topic: "product", sort_order: 1 },
      { id: "3", question: "Q other", answer: "A3", topic: "misc", sort_order: 1 },
    ];
  });

  it("reads approved FAQs only", async () => {
    const faqs = await getPublicFaqs();
    expect(db.filters).toContain("faqs.status=approved");
    expect(faqs?.map((faq) => faq.id)).toEqual(["1", "2", "3"]);
  });

  it("groups by topic in a fixed order, unknown topics last under 'Lainnya'", async () => {
    const groups = groupFaqs((await getPublicFaqs()) ?? []);
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ["Produk", ["2"]],
      ["Pengiriman", ["1"]],
      ["Lainnya", ["3"]],
    ]);
  });

  it("throws when the read fails, so a cached good page is kept instead of an error page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.error = { message: "down" };
    await expect(getPublicFaqs()).rejects.toThrow();
  });
});
