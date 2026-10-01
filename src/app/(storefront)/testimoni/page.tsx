import { MessageCircleHeart } from "lucide-react";
import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { TESTIMONIALS_COPY } from "@/content/testimonials";
import { TestimonialList } from "@/features/testimonials/testimonial-list";
import { getPublishedTestimonials } from "@/services/content/testimonials";

export async function generateMetadata(): Promise<Metadata> {
  const testimonials = await getPublishedTestimonials();
  return {
    title: "Testimoni",
    description: "Cerita dan ulasan asli dari pelanggan CNS Beauty.",
    alternates: { canonical: ROUTES.testimonials },
    // An empty review page has nothing for search engines yet.
    robots: testimonials.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function TestimonialsPage() {
  const testimonials = await getPublishedTestimonials();
  const copy = TESTIMONIALS_COPY;

  return (
    <main id="main-content">
      <PageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.body} />
      <section aria-label="Daftar testimoni" className="py-section">
        <Container>
          {testimonials.length > 0 ? (
            <TestimonialList testimonials={testimonials} />
          ) : (
            <EmptyState
              icon={<MessageCircleHeart className="size-8" strokeWidth={1.25} />}
              title={copy.empty.title}
              description={copy.empty.description}
              action={
                <ButtonLink href={ROUTES.products} variant="secondary">
                  {copy.empty.cta}
                </ButtonLink>
              }
            />
          )}
        </Container>
      </section>
    </main>
  );
}
