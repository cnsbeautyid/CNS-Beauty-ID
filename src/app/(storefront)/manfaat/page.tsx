import type { Metadata } from "next";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { BENEFITS_COPY } from "@/content/benefits";
import { BenefitJourney } from "@/features/benefits/benefit-journey";
import { RoutineSteps } from "@/features/benefits/routine-steps";
import { ConcernSection } from "@/features/home/concern-section";
import { getMappedConcerns } from "@/services/catalog/concerns";

export const metadata: Metadata = {
  title: "Manfaat",
  description: "Kenali kebutuhan kulitmu dan temukan ritual perawatan CNS Beauty yang sesuai.",
};

export default async function BenefitsPage() {
  const concerns = await getMappedConcerns();
  const copy = BENEFITS_COPY;

  return (
    <main id="main-content">
      <PageHero eyebrow={copy.hero.eyebrow} title={copy.hero.title} description={copy.hero.body} />
      <BenefitJourney />
      {/* Renders only when concerns are mapped to active products (Phase 4). */}
      <ConcernSection concerns={concerns} />
      <RoutineSteps />

      <section aria-labelledby="benefits-cta-title" className="py-section">
        <Container className="cns-reveal">
          <div className="mx-auto flex max-w-3xl flex-col items-center rounded-xl bg-ai-surface px-6 py-12 text-center tablet:px-12">
            <h2 id="benefits-cta-title" className="text-h2">
              {copy.cta.title}
            </h2>
            <p className="mt-4 max-w-xl text-body-l text-text-secondary">{copy.cta.body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <AskAIButton variant="primary" size="lg">
                {copy.cta.aiCta}
              </AskAIButton>
              <ButtonLink href={ROUTES.skinQuiz} variant="secondary" size="lg">
                {copy.cta.quizCta}
              </ButtonLink>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-caption text-text-secondary">{copy.disclaimer}</p>
        </Container>
      </section>
    </main>
  );
}
