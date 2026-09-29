import type { Metadata } from "next";

import { ROUTES } from "@/constants/routes";
import { CatalogView } from "@/features/catalog/catalog-view";
import { getCatalogFacets, listProducts } from "@/services/catalog/products";
import { hasActiveFilters, parseCatalogQuery } from "@/services/catalog/query";

export async function generateMetadata({ searchParams }: PageProps<"/produk">): Promise<Metadata> {
  const query = parseCatalogQuery(await searchParams);
  return {
    title: "Semua Produk",
    description: "Jelajahi produk perawatan kulit CNS Beauty Skincare.",
    alternates: { canonical: ROUTES.products },
    // Search and filter combinations are for people, not the index.
    robots: hasActiveFilters(query) || query.halaman > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: PageProps<"/produk">) {
  const query = parseCatalogQuery(await searchParams);
  const [listing, facets] = await Promise.all([listProducts(query), getCatalogFacets()]);

  return (
    <CatalogView
      title="Semua Produk"
      description="Temukan ritual perawatan yang sesuai dengan kebutuhan kulitmu."
      basePath={ROUTES.products}
      query={query}
      listing={listing}
      facets={facets}
    />
  );
}
