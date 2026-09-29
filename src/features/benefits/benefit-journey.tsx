import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { BENEFITS_COPY } from "@/content/benefits";

/** Concern → result → product → routine (PRD §13). */
export function BenefitJourney() {
  const copy = BENEFITS_COPY.journey;

  return (
    <section aria-labelledby="journey-title" className="py-section">
      <Container className="cns-reveal">
        <SectionHeader id="journey-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ol className="mt-12 grid gap-6 tablet:grid-cols-2 desktop:grid-cols-4">
          {copy.steps.map((step, index) => (
            <li key={step.id} className="flex flex-col rounded-lg border border-border bg-background p-6">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-pill border border-brand-rose-gold font-display text-h4 text-brand-cocoa"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-h4">{step.title}</h3>
              <p className="mt-2 text-body-s text-text-secondary">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
