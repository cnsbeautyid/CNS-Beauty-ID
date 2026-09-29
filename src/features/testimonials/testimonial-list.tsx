import { BadgeCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { TESTIMONIALS_COPY } from "@/content/testimonials";
import type { Testimonial } from "@/types/content";

/** Grid of published reviews. Callers handle the empty case. */
export function TestimonialList({ testimonials }: { testimonials: readonly Testimonial[] }) {
  return (
    <ul className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
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
                  {TESTIMONIALS_COPY.verified}
                </span>
              )}
            </figcaption>
          </figure>
        </Card>
      ))}
    </ul>
  );
}
