import { Quote } from "lucide-react";

import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";

export function FounderStory() {
  const copy = HOME_COPY.founder;

  return (
    <section aria-labelledby="founder-title" className="bg-brand-ivory py-section">
      <Container className="cns-reveal flex flex-col items-center text-center">
        <h2 id="founder-title" className="flex items-center gap-3 font-body text-caption tracking-eyebrow text-brand-cocoa uppercase">
          <span aria-hidden className="h-px w-8 bg-brand-gold" />
          {copy.eyebrow}
          <span aria-hidden className="h-px w-8 bg-brand-gold" />
        </h2>

        <figure className="mt-10 flex max-w-3xl flex-col items-center">
          <Quote aria-hidden className="size-10 text-brand-gold" strokeWidth={1} />
          <blockquote className="mt-6">
            <p className="font-display text-h2 text-brand-cocoa-dark italic">{copy.quote}</p>
          </blockquote>
          <figcaption className="mt-8 flex flex-col items-center gap-1">
            <span className="font-display text-h3 text-brand-cocoa italic">{copy.name}</span>
            <span className="text-caption tracking-wider text-text-secondary uppercase">{copy.role}</span>
          </figcaption>
        </figure>

        <p className="mt-10 max-w-2xl text-body-l text-text-secondary">{copy.philosophy}</p>
        <ButtonLink href={ROUTES.about} variant="secondary" className="mt-8">
          {copy.cta}
        </ButtonLink>
      </Container>
    </section>
  );
}
