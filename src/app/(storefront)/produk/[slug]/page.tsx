import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TrackEvent } from "@/components/analytics/track-event";
import { Container } from "@/components/layout/container";
import { Rating } from "@/components/product/rating";
import { JsonLd } from "@/components/seo/json-ld";
import { ErrorState } from "@/components/ui/states";
import { BRAND } from "@/config/site";
import { productCategoryPath, productPath, ROUTES } from "@/constants/routes";
import { AIContextSetter } from "@/features/product-detail/ai-context-setter";
import { ProductGallery } from "@/features/product-detail/product-gallery";
import {
  BenefitsSection,
  FaqSection,
  IngredientsSection,
  RelatedSection,
  ReviewsSection,
  TaxonomySection,
  UsageSection,
} from "@/features/product-detail/product-sections";
import { PurchasePanel, StickyCommerceBar } from "@/features/product-detail/purchase-panel";
import { productShareMetadata } from "@/lib/seo/share";
import { breadcrumbJsonLd, productBreadcrumbs, productJsonLd } from "@/lib/seo/structured-data";
import {
  getActiveProductSlugs,
  getApprovedReviews,
  getProductBySlug,
  getRelatedProducts,
} from "@/services/catalog/product-detail";
import { getPublicContact } from "@/services/content/contact";

// Price and stock refresh every 5 minutes; checkout re-validates server-side.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getActiveProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/produk/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (result.status !== "ok") return { title: "Produk tidak ditemukan", robots: { index: false } };
  const { product } = result;
  const description = product.shortDescription
    ? `${product.name}: ${product.shortDescription}.`
    : `${product.name} dari ${BRAND.legalName}.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: productPath(product.slug) },
    ...productShareMetadata({ name: product.name, description, images: product.images }),
  };
}

export default async function ProductDetailPage({ params }: PageProps<"/produk/[slug]">) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (result.status === "not_found") notFound();
  if (result.status === "error") {
    return (
      <main id="main-content">
        <Container className="py-section">
          <ErrorState description="Detail produk belum dapat dimuat. Silakan coba lagi dalam beberapa saat." />
        </Container>
      </main>
    );
  }

  const { product } = result;
  const [related, reviews, contact] = await Promise.all([
    getRelatedProducts(product.id),
    getApprovedReviews(product.id),
    getPublicContact(),
  ]);

  const details = [
    { term: "Ukuran", value: product.size },
    { term: "Tekstur", value: product.texture },
    { term: "Nomor BPOM", value: product.bpomNumber },
  ].filter((item): item is { term: string; value: string } => Boolean(item.value));

  return (
    <main id="main-content" className="pb-24 desktop:pb-0">
      <AIContextSetter
        context={{
          pageType: "product",
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          categoryId: product.category?.id,
        }}
      />
      <TrackEvent name="PRODUCT_VIEWED" productId={product.id} properties={{ slug: product.slug }} />
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={breadcrumbJsonLd(productBreadcrumbs(product))} />

      <Container className="py-8 desktop:py-12">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-caption text-text-secondary">
            <li>
              <Link href={ROUTES.home} className="hover:text-text-primary">
                Beranda
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3" />
            </li>
            <li>
              <Link href={ROUTES.products} className="hover:text-text-primary">
                Produk
              </Link>
            </li>
            {product.category && (
              <>
                <li aria-hidden>
                  <ChevronRight className="size-3" />
                </li>
                <li>
                  <Link href={productCategoryPath(product.category.slug)} className="hover:text-text-primary">
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>
              <ChevronRight className="size-3" />
            </li>
            <li aria-current="page" className="text-text-primary">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 desktop:grid-cols-2 desktop:gap-16">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="desktop:sticky desktop:top-28 desktop:self-start">
            <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">{product.category?.name ?? BRAND.name}</p>
            <h1 className="mt-3 text-h1 text-brand-cocoa-dark">{product.name}</h1>
            {product.shortDescription && <p className="mt-3 text-body-l text-text-secondary">{product.shortDescription}</p>}
            {product.copy.positioning && <p className="mt-3 text-body text-text-primary">{product.copy.positioning}</p>}
            {product.rating && <Rating average={product.rating.average} count={product.rating.count} className="mt-3" />}

            {details.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 text-body-s">
                {details.map((item) => (
                  <div key={item.term}>
                    <dt className="text-text-secondary">{item.term}</dt>
                    <dd className="font-medium text-text-primary">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-6">
              <PurchasePanel product={product} whatsapp={contact?.whatsapp} />
            </div>

            {product.copy.description && <p className="mt-8 text-body text-text-primary">{product.copy.description}</p>}
          </div>
        </div>

        <div className="mt-12">
          <IngredientsSection product={product} />
          <UsageSection product={product} />
          <BenefitsSection benefits={product.copy.benefits} />
          <TaxonomySection product={product} />
          <FaqSection faqs={product.copy.faqs} />
          <ReviewsSection reviews={reviews} />
          <RelatedSection products={related} />
        </div>
      </Container>

      <StickyCommerceBar product={product} />
    </main>
  );
}
