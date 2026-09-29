import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { productCategoryPath } from "@/constants/routes";
import { CatalogView } from "@/features/catalog/catalog-view";
import { getCatalogFacets, getCategoryBySlug, listProducts } from "@/services/catalog/products";
import { hasActiveFilters, parseCatalogQuery } from "@/services/catalog/query";

export async function generateMetadata({ params, searchParams }: PageProps<"/produk/kategori/[slug]">): Promise<Metadata> {
  const [{ slug }, query] = [await params, parseCatalogQuery(await searchParams)];
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Kategori tidak ditemukan", robots: { index: false } };
  return {
    title: category.name,
    description: `Produk ${category.name} dari CNS Beauty Skincare.`,
    alternates: { canonical: productCategoryPath(category.slug) },
    robots: hasActiveFilters(query) || query.halaman > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/produk/kategori/[slug]">) {
  const { slug } = await params;
  const query = parseCatalogQuery(await searchParams);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [listing, facets] = await Promise.all([listProducts(query, { categoryId: category.id }), getCatalogFacets()]);

  return (
    <CatalogView
      title={category.name}
      basePath={productCategoryPath(category.slug)}
      query={query}
      listing={listing}
      facets={facets}
      activeCategorySlug={category.slug}
    />
  );
}
