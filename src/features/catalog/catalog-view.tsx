import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { productCategoryPath, ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { CatalogFacets, CatalogListing } from "@/services/catalog/products";
import { buildCatalogHref, hasActiveFilters, PRICE_RANGES, type CatalogQuery } from "@/services/catalog/query";

import { FilterDrawer } from "./filter-drawer";
import { FilterPanel } from "./filter-panel";
import { SortSelect } from "./sort-select";

type CatalogViewProps = {
  title: string;
  description?: string;
  basePath: string;
  query: CatalogQuery;
  listing: CatalogListing;
  facets: CatalogFacets | null;
  activeCategorySlug?: string;
};

export function CatalogView({ title, description, basePath, query, listing, facets, activeCategorySlug }: CatalogViewProps) {
  const activeChips = facets ? activeFilterChips(basePath, query, facets) : [];

  return (
    <main id="main-content">
      <section aria-labelledby="page-title" className="bg-brand-cream">
        <Container className="py-12 desktop:py-16">
          <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">Produk</p>
          <h1 id="page-title" className="mt-3 text-display-l text-brand-cocoa-dark">
            {title}
          </h1>
          {description && <p className="mt-3 max-w-2xl text-body-l text-text-secondary">{description}</p>}
          <SearchForm basePath={basePath} query={query} />
        </Container>
      </section>

      <Container className="py-10">
        {facets && facets.categories.length > 0 && (
          <nav aria-label="Kategori produk" className="-mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
            <ul className="flex w-max gap-2 tablet:w-auto tablet:flex-wrap">
              <CategoryChip href={ROUTES.products} label="Semua" active={!activeCategorySlug} />
              {facets.categories.map((category) => (
                <CategoryChip
                  key={category.slug}
                  href={productCategoryPath(category.slug)}
                  label={category.name}
                  active={activeCategorySlug === category.slug}
                />
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-8 grid gap-10 desktop:grid-cols-4">
          {facets && (
            <aside aria-label="Filter produk" className="hidden desktop:block">
              <FilterPanel basePath={basePath} query={query} facets={facets} idPrefix="filter-desktop" />
            </aside>
          )}

          <div className={cn(facets && "desktop:col-span-3")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <p aria-live="polite" className="text-body-s text-text-secondary">
                {listing.status === "ok" ? `${listing.total} produk` : " "}
              </p>
              <div className="flex items-center gap-3">
                {facets && (
                  <div className="desktop:hidden">
                    <FilterDrawer key={buildCatalogHref(basePath, query)} activeCount={activeChips.length}>
                      <FilterPanel basePath={basePath} query={query} facets={facets} idPrefix="filter-mobile" />
                    </FilterDrawer>
                  </div>
                )}
                <SortSelect basePath={basePath} query={query} />
              </div>
            </div>

            {activeChips.length > 0 && (
              <ul aria-label="Filter aktif" className="mt-4 flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <li key={chip.key}>
                    <Link
                      href={chip.removeHref}
                      scroll={false}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-secondary px-3 text-body-s text-text-primary hover:bg-brand-beige"
                    >
                      {chip.label}
                      <X aria-hidden className="size-3.5" />
                      <span className="sr-only">(hapus filter)</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={basePath} className="text-body-s font-medium text-brand-cocoa underline underline-offset-4">
                    Hapus semua
                  </Link>
                </li>
              </ul>
            )}

            <div className="mt-8">
              <Results basePath={basePath} query={query} listing={listing} />
            </div>

            <div className="mt-16 flex flex-col items-start gap-4 rounded-xl bg-ai-surface p-6 tablet:flex-row tablet:items-center tablet:justify-between desktop:p-8">
              <div>
                <p className="font-display text-h4 text-text-primary">Bingung memilih?</p>
                <p className="mt-1 text-body-s text-text-secondary">Ceritakan kebutuhan kulitmu kepada CNS Beauty AI.</p>
              </div>
              <AskAIButton prefill={query.q ? `Saya mencari produk: ${query.q}` : undefined}>
                Tanya CNS Beauty AI
              </AskAIButton>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

function SearchForm({ basePath, query }: { basePath: string; query: CatalogQuery }) {
  return (
    <Form action={basePath} role="search" className="mt-8 flex max-w-xl items-center gap-2 rounded-pill border border-border bg-background py-1 pr-1 pl-4 focus-within:border-primary">
      <Search aria-hidden className="size-4 shrink-0 text-text-secondary" />
      <label htmlFor="catalog-search" className="sr-only">
        Cari produk
      </label>
      <input
        id="catalog-search"
        type="search"
        name="q"
        defaultValue={query.q}
        maxLength={100}
        placeholder="Cari produk, kandungan, atau kebutuhan kulit"
        className="h-10 flex-1 bg-transparent text-body-s text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
      />
      {query.kebutuhan && <input type="hidden" name="kebutuhan" value={query.kebutuhan} />}
      {query.kulit && <input type="hidden" name="kulit" value={query.kulit} />}
      {query.harga && <input type="hidden" name="harga" value={query.harga} />}
      <button
        type="submit"
        className="h-10 rounded-pill bg-primary px-5 text-body-s font-medium text-on-primary transition-colors duration-(--duration-base) hover:bg-brand-cocoa-dark"
      >
        Cari
      </button>
    </Form>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex min-h-10 items-center rounded-pill border px-4 text-body-s whitespace-nowrap transition-colors duration-(--duration-base)",
          active ? "border-brand-cocoa bg-brand-cocoa text-on-primary" : "border-border text-text-primary hover:border-brand-rose-gold",
        )}
      >
        {label}
      </Link>
    </li>
  );
}

function Results({ basePath, query, listing }: { basePath: string; query: CatalogQuery; listing: CatalogListing }) {
  if (listing.status === "unavailable") {
    return <EmptyState title="Katalog sedang disiapkan" description="Produk CNS Beauty akan segera tampil di sini." />;
  }
  if (listing.status === "error") {
    return (
      <ErrorState
        description="Katalog belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
        action={
          <ButtonLink href={buildCatalogHref(basePath, query, { halaman: query.halaman })} variant="secondary">
            Coba lagi
          </ButtonLink>
        }
      />
    );
  }
  if (listing.products.length === 0) {
    return hasActiveFilters(query) ? (
      <EmptyState
        icon={<Search className="size-8" strokeWidth={1.25} />}
        title="Produk tidak ditemukan"
        description="Coba kata kunci lain atau kurangi filter yang dipilih."
        action={
          <ButtonLink href={basePath} variant="secondary">
            Hapus filter
          </ButtonLink>
        }
      />
    ) : (
      <EmptyState title="Belum ada produk" description="Produk untuk kategori ini akan segera tersedia." />
    );
  }

  return (
    <>
      <ProductGrid products={listing.products} layout="with-sidebar" priorityCount={4} />
      {listing.pageCount > 1 && (
        <nav aria-label="Halaman produk" className="mt-12 flex items-center justify-center gap-4 text-body-s">
          {listing.page > 1 ? (
            <Link
              href={buildCatalogHref(basePath, query, { halaman: listing.page - 1 })}
              className="inline-flex min-h-11 items-center gap-1 text-text-primary"
            >
              <ChevronLeft aria-hidden className="size-4" /> Sebelumnya
            </Link>
          ) : null}
          <span className="text-text-secondary">
            Halaman {listing.page} dari {listing.pageCount}
          </span>
          {listing.page < listing.pageCount ? (
            <Link
              href={buildCatalogHref(basePath, query, { halaman: listing.page + 1 })}
              className="inline-flex min-h-11 items-center gap-1 text-text-primary"
            >
              Berikutnya <ChevronRight aria-hidden className="size-4" />
            </Link>
          ) : null}
        </nav>
      )}
    </>
  );
}

function activeFilterChips(basePath: string, query: CatalogQuery, facets: CatalogFacets) {
  const chips: { key: string; label: string; removeHref: string }[] = [];
  if (query.q) chips.push({ key: "q", label: `“${query.q}”`, removeHref: buildCatalogHref(basePath, query, { q: undefined }) });
  const concern = facets.concerns.find((c) => c.slug === query.kebutuhan);
  if (concern) chips.push({ key: "kebutuhan", label: concern.name, removeHref: buildCatalogHref(basePath, query, { kebutuhan: undefined }) });
  const skinType = facets.skinTypes.find((s) => s.slug === query.kulit);
  if (skinType) chips.push({ key: "kulit", label: `Kulit ${skinType.name}`, removeHref: buildCatalogHref(basePath, query, { kulit: undefined }) });
  const price = PRICE_RANGES.find((r) => r.id === query.harga);
  if (price) chips.push({ key: "harga", label: price.label, removeHref: buildCatalogHref(basePath, query, { harga: undefined }) });
  return chips;
}
