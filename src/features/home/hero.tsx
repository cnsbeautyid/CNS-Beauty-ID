import { ArrowRight } from "lucide-react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { ArchMedia } from "@/components/layout/arch-media";
import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";

export function Hero() {
  const copy = HOME_COPY.hero;

  return (
    <section aria-labelledby="hero-title" className="overflow-hidden bg-brand-cream">
      <Container className="grid items-center gap-12 py-section desktop:grid-cols-12 desktop:gap-8">
        <div className="flex flex-col items-start desktop:col-span-6">
          <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">{copy.eyebrow}</p>
          <h1 id="hero-title" className="mt-6 text-display-xl text-brand-cocoa-dark">
            {copy.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-body-l text-text-secondary">{copy.body}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink
              href={ROUTES.products}
              variant="brand"
              size="lg"
              trailingIcon={<ArrowRight aria-hidden className="size-4" />}
            >
              {copy.primaryCta}
            </ButtonLink>
            <ButtonLink href={ROUTES.about} variant="secondary" size="lg">
              {copy.secondaryCta}
            </ButtonLink>
          </div>
          <AskAIButton variant="ghost" className="mt-3 -ml-6">
            {copy.aiCta}
          </AskAIButton>
        </div>

        <div className="desktop:col-span-6">
          <ArchMedia image={copy.image} priority />
        </div>
      </Container>
    </section>
  );
}
