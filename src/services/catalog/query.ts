import { z } from "zod";

// Catalog URL state (CLAUDE.md: URL state lives in searchParams). Pure and
// shared by server pages, filter links and unit tests.

export { PAGE_SIZE, PRICE_RANGES, SORT_OPTIONS, type PriceRangeId, type SortId } from "./options";
import { PRICE_RANGES, SORT_OPTIONS, type PriceRangeId, type SortId } from "./options";

const MAX_PAGE = 100;

const slug = z.string().regex(/^[a-z0-9-]{1,64}$/);

// Each field falls back to "unset" when invalid, so a tampered URL never
// errors; it just shows the unfiltered catalog.
const schema = z.object({
  q: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " ").slice(0, 100))
    .pipe(z.string().min(1))
    .optional()
    .catch(undefined),
  kebutuhan: slug.optional().catch(undefined),
  kulit: slug.optional().catch(undefined),
  harga: z.enum(PRICE_RANGES.map((range) => range.id) as [PriceRangeId, ...PriceRangeId[]]).optional().catch(undefined),
  urut: z
    .enum(SORT_OPTIONS.map((option) => option.id) as [SortId, ...SortId[]])
    .catch("featured")
    .default("featured"),
  halaman: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1).default(1),
});

export type CatalogQuery = z.infer<typeof schema>;

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseCatalogQuery(searchParams: RawSearchParams): CatalogQuery {
  const first = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return schema.parse({
    q: first("q"),
    kebutuhan: first("kebutuhan"),
    kulit: first("kulit"),
    harga: first("harga"),
    urut: first("urut"),
    halaman: first("halaman"),
  });
}

export type CatalogQueryPatch = Partial<Record<Exclude<keyof CatalogQuery, "halaman">, string | undefined>> & {
  halaman?: number;
};

/**
 * Link to `basePath` with `query` changed by `patch` (undefined removes a
 * key). Any filter change resets to page 1 unless `halaman` is patched.
 */
export function buildCatalogHref(basePath: string, query: Partial<CatalogQuery>, patch: CatalogQueryPatch = {}): string {
  const merged: Record<string, string | number | undefined> = { ...query, halaman: undefined, ...patch };
  const params = new URLSearchParams();
  for (const key of ["q", "kebutuhan", "kulit", "harga", "urut", "halaman"] as const) {
    const value = merged[key];
    if (value === undefined || value === "") continue;
    if (key === "urut" && value === "featured") continue;
    if (key === "halaman" && value === 1) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function priceRange(id: PriceRangeId | undefined) {
  return PRICE_RANGES.find((range) => range.id === id);
}

export function hasActiveFilters(query: CatalogQuery): boolean {
  return Boolean(query.q || query.kebutuhan || query.kulit || query.harga);
}
