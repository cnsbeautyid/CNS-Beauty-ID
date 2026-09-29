import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";

export function ClosingCta() {
  const copy = HOME_COPY.closing;

  return (
    <section aria-labelledby="closing-title" className="bg-brand-cocoa-dark py-section text-on-primary">
      <Container className="cns-reveal flex flex-col items-center text-center">
        <h2 id="closing-title" className="max-w-3xl text-display-l">
          {copy.title}
        </h2>
        <p className="mt-4 font-display text-h4 italic">{copy.body}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href={ROUTES.products} variant="inverse" size="lg">
            {copy.primaryCta}
          </ButtonLink>
          <AskAIButton variant="inverse-outline" size="lg">
            {copy.aiCta}
          </AskAIButton>
        </div>
      </Container>
    </section>
  );
}
