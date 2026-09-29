import { Sparkles } from "lucide-react";
import Link from "next/link";

import { AskAIButton, AskAIChip } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { AI_QUICK_ACTIONS } from "@/config/ai";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";

export function AIConciergeSection() {
  const copy = HOME_COPY.ai;

  return (
    <section aria-labelledby="ai-title" className="bg-ai-surface py-section">
      <Container className="cns-reveal grid items-center gap-10 desktop:grid-cols-2 desktop:gap-16">
        <div className="flex flex-col items-start">
          <p className="flex items-center gap-2 text-caption tracking-eyebrow text-brand-cocoa uppercase">
            <Sparkles aria-hidden className="size-4 text-ai-accent" />
            {copy.eyebrow}
          </p>
          <h2 id="ai-title" className="mt-4 text-h1 text-text-primary">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-lg text-body-l text-text-secondary">{copy.body}</p>
          <AskAIButton variant="primary" size="lg" className="mt-8">
            {copy.cta}
          </AskAIButton>
          <p className="mt-6 text-body-s text-text-secondary">
            {copy.quizPrompt}{" "}
            <Link href={ROUTES.skinQuiz} className="font-medium text-brand-cocoa underline underline-offset-4">
              {copy.quizCta}
            </Link>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-6 desktop:p-8">
          <p id="ai-prompts-label" className="text-caption tracking-eyebrow text-text-secondary uppercase">
            {copy.promptsLabel}
          </p>
          <ul aria-labelledby="ai-prompts-label" className="mt-4 flex flex-wrap gap-2">
            {AI_QUICK_ACTIONS.map((action) => (
              <li key={action.id}>
                <AskAIChip prefill={action.prompt}>{action.label}</AskAIChip>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
