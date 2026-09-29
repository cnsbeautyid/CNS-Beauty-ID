import { BadgeCheck, ChevronDown, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { buildCatalogHref } from "@/services/catalog/query";
import type { ProductCardData, ProductDetail, ProductReview } from "@/types/product";

function DetailSection({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("border-t border-border py-10", className)}>
      <h2 id={id} className="text-h3">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const ROUTINE_TIME = { am: "Pagi", pm: "Malam", both: "Pagi & malam" } as const;

export function IngredientsSection({ product }: { product: ProductDetail }) {
  if (product.ingredients.length === 0 && !product.fullIngredients) return null;
  return (
    <DetailSection id="ingredients-title" title="Kandungan">
      {product.ingredients.length > 0 && (
        <ul className="grid gap-4 tablet:grid-cols-2">
          {product.ingredients.map((ingredient) => (
            <li key={ingredient.name} className="rounded-lg border border-border p-5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-h4 text-text-primary">{ingredient.name}</span>
                {ingredient.concentration && <span className="text-body-s text-brand-cocoa">{ingredient.concentration}</span>}
                {ingredient.isKey && <span className="text-caption tracking-wider text-text-secondary uppercase">Kandungan utama</span>}
              </p>
              {ingredient.benefit && <p className="mt-2 text-body-s text-text-secondary">{ingredient.benefit}</p>}
            </li>
          ))}
        </ul>
      )}
      {product.fullIngredients && (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-body-s font-medium text-text-primary">
            Daftar lengkap kandungan
            <ChevronDown aria-hidden className="size-4 transition-transform duration-(--duration-base) group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-body-s text-text-secondary">{product.fullIngredients}</p>
        </details>
      )}
    </DetailSection>
  );
}

export function UsageSection({ product }: { product: ProductDetail }) {
  if (!product.howToUse && !product.routineTime && !product.routineStep) return null;
  return (
    <DetailSection id="usage-title" title="Cara Pakai">
      {product.howToUse && <p className="max-w-2xl text-body text-text-primary">{product.howToUse}</p>}
      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-body-s">
        {product.routineTime && (
          <div>
            <dt className="text-text-secondary">Waktu pemakaian</dt>
            <dd className="font-medium text-text-primary">{ROUTINE_TIME[product.routineTime]}</dd>
          </div>
        )}
        {product.routineStep && (
          <div>
            <dt className="text-text-secondary">Langkah ritual</dt>
            <dd className="font-medium text-text-primary">{product.routineStep}</dd>
          </div>
        )}
      </dl>
    </DetailSection>
  );
}

/** Approved benefits only (review_status = approved; see services/catalog/claims.ts). */
export function BenefitsSection({ benefits }: { benefits: ProductDetail["copy"]["benefits"] }) {
  if (benefits.length === 0) return null;
  return (
    <DetailSection id="benefits-title" title="Manfaat">
      <ul className="grid gap-4 tablet:grid-cols-2">
        {benefits.map((benefit) => (
          <li key={benefit.title}>
            <p className="font-display text-h4">{benefit.title}</p>
            {benefit.body && <p className="mt-1 text-body-s text-text-secondary">{benefit.body}</p>}
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

/** Catalog taxonomy as navigation (not a suitability claim). */
export function TaxonomySection({ product }: { product: ProductDetail }) {
  const groups = [
    { key: "kebutuhan" as const, title: "Kebutuhan kulit", items: product.concerns },
    { key: "kulit" as const, title: "Jenis kulit", items: product.skinTypes },
  ].filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <DetailSection id="taxonomy-title" title="Temukan Produk Serupa">
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-caption tracking-eyebrow text-text-secondary uppercase">{group.title}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={buildCatalogHref(ROUTES.products, {}, { [group.key]: item.slug })}
                    className="inline-flex min-h-10 items-center rounded-pill border border-border px-4 text-body-s text-text-primary transition-colors duration-(--duration-base) hover:border-brand-rose-gold"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}

/** Approved FAQs only. Native disclosure: keyboard and screen-reader friendly. */
export function FaqSection({ faqs }: { faqs: ProductDetail["copy"]["faqs"] }) {
  if (faqs.length === 0) return null;
  return (
    <DetailSection id="faq-title" title="Pertanyaan Umum">
      <div className="divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium">
              {faq.question}
              <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform duration-(--duration-base) group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-body-s text-text-secondary">{faq.answer}</p>
          </details>
        ))}
      </div>
    </DetailSection>
  );
}

export function ReviewsSection({ reviews }: { reviews: readonly ProductReview[] | null }) {
  return (
    <DetailSection id="reviews-title" title="Ulasan">
      {reviews === null ? (
        <p role="alert" className="text-body-s text-text-secondary">
          Ulasan belum dapat dimuat. Silakan muat ulang halaman.
        </p>
      ) : reviews.length === 0 ? (
        <EmptyState
          className="items-start px-0 py-0 text-left"
          icon={<Star className="size-8" strokeWidth={1.25} />}
          title="Belum ada ulasan"
          description="Ulasan dari pelanggan yang telah membeli produk ini akan tampil di sini setelah dimoderasi."
        />
      ) : (
        <ul className="grid gap-6 tablet:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-border p-5">
              <p className="flex items-center gap-1" aria-label={`Rating ${review.rating} dari 5`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    aria-hidden
                    strokeWidth={1.5}
                    className={cn("size-4", index < review.rating ? "fill-brand-gold text-brand-gold" : "text-border")}
                  />
                ))}
              </p>
              {review.title && <p className="mt-3 font-display text-h4">{review.title}</p>}
              <p className="mt-2 text-body-s text-text-primary">{review.body}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary">
                <span className="font-medium text-text-primary">{review.authorName}</span>
                {review.skinType && <span>Kulit {review.skinType}</span>}
                <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                {review.verifiedPurchase && (
                  <span className="flex items-center gap-1 text-success">
                    <BadgeCheck aria-hidden className="size-3.5" />
                    Pembelian terverifikasi
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}

export function RelatedSection({ products }: { products: readonly ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <DetailSection id="related-title" title="Lengkapi Ritualmu">
      <ProductGrid products={products} />
    </DetailSection>
  );
}
