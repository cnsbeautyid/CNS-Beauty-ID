import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";
import type { ProductCardData } from "@/types/product";

/** Hidden until the catalog (Phase 4) supplies active products. */
export function FeaturedProducts({ products }: { products: readonly ProductCardData[] }) {
  if (products.length === 0) return null;
  const copy = HOME_COPY.featured;

  return (
    <section aria-labelledby="featured-title" className="py-section">
      <Container className="cns-reveal">
        <SectionHeader
          id="featured-title"
          align="start"
          eyebrow={copy.eyebrow}
          title={copy.title}
          action={
            <ButtonLink href={ROUTES.products} variant="secondary">
              {copy.cta}
            </ButtonLink>
          }
        />
        <div className="mt-12">
          <ProductGrid products={products} />
        </div>
      </Container>
    </section>
  );
}
