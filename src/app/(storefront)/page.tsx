import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { SOCIAL_LINKS } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { AIConciergeSection } from "@/features/home/ai-concierge-section";
import { BrandValues } from "@/features/home/brand-values";
import { ClosingCta } from "@/features/home/closing-cta";
import { ConcernSection } from "@/features/home/concern-section";
import { FeaturedProducts } from "@/features/home/featured-products";
import { FounderStory } from "@/features/home/founder-story";
import { Hero } from "@/features/home/hero";
import { JournalSection } from "@/features/home/journal-section";
import { TestimonialsSection } from "@/features/home/testimonials-section";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import { getPublicContact } from "@/services/content/contact";
import { getHomePageData } from "@/services/content/home-page";

export const metadata: Metadata = {
  title: { absolute: "CNS Beauty Skincare — Kulit Sehat, Lebih Percaya Diri" },
  description:
    "CNS Beauty Skincare by Wina Ranesa. Temukan ritual perawatan kulit yang tepat untukmu, dengan bantuan CNS Beauty AI.",
  alternates: { canonical: ROUTES.home },
};

// Catalog data (featured products, concerns) refreshes every 5 minutes.
export const revalidate = 300;

// Order follows master prompt §6. Data-driven sections render only when
// their source has real, approved data.
export default async function HomePage() {
  const [{ concerns, featuredProducts, testimonials, articles }, contact] = await Promise.all([getHomePageData(), getPublicContact()]);

  return (
    <main id="main-content">
      <JsonLd data={organizationJsonLd(contact, SOCIAL_LINKS.map((link) => link.href))} />
      <JsonLd data={websiteJsonLd()} />
      <Hero />
      <BrandValues />
      <ConcernSection concerns={concerns} />
      <FeaturedProducts products={featuredProducts} />
      <AIConciergeSection />
      <FounderStory />
      <TestimonialsSection testimonials={testimonials} />
      <JournalSection articles={articles} />
      <ClosingCta />
    </main>
  );
}
