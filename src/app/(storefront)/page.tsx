import type { Metadata } from "next";

import { AIConciergeSection } from "@/features/home/ai-concierge-section";
import { BrandValues } from "@/features/home/brand-values";
import { ClosingCta } from "@/features/home/closing-cta";
import { ConcernSection } from "@/features/home/concern-section";
import { FeaturedProducts } from "@/features/home/featured-products";
import { FounderStory } from "@/features/home/founder-story";
import { Hero } from "@/features/home/hero";
import { JournalSection } from "@/features/home/journal-section";
import { TestimonialsSection } from "@/features/home/testimonials-section";
import { getHomePageData } from "@/services/content/home-page";

export const metadata: Metadata = {
  title: { absolute: "CNS Beauty Skincare — Kulit Sehat, Lebih Percaya Diri" },
  description:
    "CNS Beauty Skincare by Wina Ranesa. Temukan ritual perawatan kulit yang tepat untukmu, dengan bantuan CNS Beauty AI.",
};

// Order follows master prompt §6. Data-driven sections render only when
// their source has real, approved data.
export default async function HomePage() {
  const { concerns, featuredProducts, testimonials, articles } = await getHomePageData();

  return (
    <main id="main-content">
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
