import { BadgeCheck } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { Card } from "@/components/ui/card";
import { HOME_COPY } from "@/content/home";
import type { Testimonial } from "@/types/content";

/** Published, moderated reviews only. Renders nothing when there are none. */
export function TestimonialsSection({ testimonials }: { testimonials: readonly Testimonial[] }) {
  if (testimonials.length === 0) return null;
  const copy = HOME_COPY.testimonials;

  return (
    <section aria-labelledby="testimonials-title" className="py-section">
      <Container className="cns-reveal">
        <SectionHeader id="testimonials-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ul className="mt-12 grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
          {testimonials.map((item) => (
            <Card as="li" key={item.id} padding="lg" className="flex flex-col">
              <figure className="flex h-full flex-col">
                <blockquote className="flex-1">
                  <p className="font-display text-h4 text-text-primary">“{item.quote}”</p>
                </blockquote>
                <figcaption className="mt-6 flex flex-col gap-1 text-body-s">
                  <span className="font-medium text-text-primary">{item.authorName}</span>
                  {item.productName && <span className="text-text-secondary">{item.productName}</span>}
                  {item.verifiedPurchase && (
                    <span className="mt-1 flex items-center gap-1 text-caption text-success">
                      <BadgeCheck aria-hidden className="size-4" />
                      {copy.verified}
                    </span>
                  )}
                </figcaption>
              </figure>
            </Card>
          ))}
        </ul>
      </Container>
    </section>
  );
}
