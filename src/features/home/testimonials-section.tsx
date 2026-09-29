import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";
import { TestimonialList } from "@/features/testimonials/testimonial-list";
import type { Testimonial } from "@/types/content";

/** Published, moderated reviews only. Renders nothing when there are none. */
export function TestimonialsSection({ testimonials }: { testimonials: readonly Testimonial[] }) {
  if (testimonials.length === 0) return null;
  const copy = HOME_COPY.testimonials;

  return (
    <section aria-labelledby="testimonials-title" className="py-section">
      <Container className="cns-reveal">
        <SectionHeader
          id="testimonials-title"
          align="start"
          eyebrow={copy.eyebrow}
          title={copy.title}
          action={
            <ButtonLink href={ROUTES.testimonials} variant="secondary">
              {copy.cta}
            </ButtonLink>
          }
        />
        <div className="mt-12">
          <TestimonialList testimonials={testimonials} />
        </div>
      </Container>
    </section>
  );
}
