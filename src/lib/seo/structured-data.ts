import { BRAND } from "@/config/site";
import { productCategoryPath, productPath, ROUTES } from "@/constants/routes";
import { clientEnv } from "@/lib/env/client";
import type { ProductDetail } from "@/types/product";
import type { PublicContact } from "@/services/content/contact";

// JSON-LD builders. Every value comes from data the page itself renders;
// nothing is inferred or embellished. Rendered with <JsonLd>.

const CONTEXT = "https://schema.org";
const LOGO_PATH = "/brand/cns-logo-mark.png";

export type Crumb = { name: string; path: string };

export const absoluteUrl = (path: string, base: string = clientEnv.NEXT_PUBLIC_SITE_URL) => new URL(path, base).toString();

export function breadcrumbJsonLd(items: Crumb[], base?: string) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path, base) })),
  };
}

export function productBreadcrumbs(product: Pick<ProductDetail, "name" | "slug" | "category">): Crumb[] {
  return [
    { name: "Beranda", path: ROUTES.home },
    { name: "Produk", path: ROUTES.products },
    ...(product.category ? [{ name: product.category.name, path: productCategoryPath(product.category.slug) }] : []),
    { name: product.name, path: productPath(product.slug) },
  ];
}

export function productJsonLd(product: ProductDetail, base?: string) {
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    // Only factual copy: unapproved marketing descriptions are never emitted.
    ...(product.shortDescription && { description: product.shortDescription }),
    ...(product.images.length > 0 && { image: product.images.map((image) => image.src) }),
    brand: { "@type": "Brand", name: BRAND.name },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(productPath(product.slug), base),
      priceCurrency: "IDR",
      price: product.price.amount,
      availability: product.availability === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    // `rating` is only set when there is at least one review.
    ...(product.rating && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count },
    }),
  };
}

/** Home page only. `sameAs` takes verified brand profiles only (SOCIAL_LINKS). */
export function organizationJsonLd(contact: PublicContact | null, sameAs: readonly string[], base?: string) {
  const contactPoint =
    contact?.whatsapp || contact?.email
      ? {
          "@type": "ContactPoint",
          contactType: "customer service",
          availableLanguage: "id",
          ...(contact.whatsapp && { telephone: `+${contact.whatsapp}` }),
          ...(contact.email && { email: contact.email }),
        }
      : undefined;
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: absoluteUrl(ROUTES.home, base),
    logo: absoluteUrl(LOGO_PATH, base),
    ...(sameAs.length > 0 && { sameAs: [...sameAs] }),
    ...(contactPoint && { contactPoint }),
  };
}

export function websiteJsonLd(base?: string) {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: BRAND.name,
    url: absoluteUrl(ROUTES.home, base),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(ROUTES.products, base)}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  if (faqs.length === 0) return null;
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
}
