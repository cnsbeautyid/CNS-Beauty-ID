import "server-only";

import type { Testimonial } from "@/types/content";

/**
 * Published, moderated reviews (reviews.is_published = true). Empty until
 * the reviews flow exists; callers must render an empty state, never
 * placeholder testimonials.
 */
export async function getPublishedTestimonials(options: { limit?: number } = {}): Promise<Testimonial[]> {
  const testimonials: Testimonial[] = [];
  return options.limit === undefined ? testimonials : testimonials.slice(0, options.limit);
}
