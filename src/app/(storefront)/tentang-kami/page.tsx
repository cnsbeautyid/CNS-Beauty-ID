import type { Metadata } from "next";

import { ArchMedia } from "@/components/layout/arch-media";
import { PageHero } from "@/components/layout/page-hero";
import { ABOUT_COPY } from "@/content/about";
import { RitualMeaning } from "@/features/about/ritual-meaning";
import { BrandValues } from "@/features/home/brand-values";
import { ClosingCta } from "@/features/home/closing-cta";
import { FounderStory } from "@/features/home/founder-story";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "CNS Beauty Skincare by Wina Ranesa: ritual kecil untuk merawat dan mencintai diri sendiri setiap hari.",
};

export default function AboutPage() {
  const hero = ABOUT_COPY.hero;

  return (
    <main id="main-content">
      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        description={hero.body}
        media={<ArchMedia image={hero.image} priority />}
      />
      <FounderStory showCta={false} />
      <RitualMeaning />
      <BrandValues />
      <ClosingCta />
    </main>
  );
}
