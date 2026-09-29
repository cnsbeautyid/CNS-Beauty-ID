import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { BENEFITS_COPY } from "@/content/benefits";

/** Glow Routine order by product category. No product-level claims here. */
export function RoutineSteps() {
  const copy = BENEFITS_COPY.routine;

  return (
    <section aria-labelledby="routine-title" className="bg-brand-ivory py-section">
      <Container className="cns-reveal">
        <SectionHeader id="routine-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ol className="mx-auto mt-12 grid max-w-5xl gap-10 tablet:grid-cols-3 tablet:gap-6">
          {copy.steps.map((step) => (
            <li key={step.id} className="flex flex-col items-center text-center">
              <span className="text-caption tracking-eyebrow text-brand-cocoa uppercase">{step.label}</span>
              <h3 className="mt-3 text-h3">{step.title}</h3>
              <span aria-hidden className="mt-4 h-px w-12 bg-brand-gold" />
              <p className="mt-4 max-w-xs text-body-s text-text-secondary">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex justify-center">
          <ButtonLink href={ROUTES.products} variant="secondary">
            {copy.cta}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
