import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";
import type { SkinConcern } from "@/types/content";

/** Only concerns with mapped products are passed in; renders nothing otherwise. */
export function ConcernSection({ concerns }: { concerns: readonly SkinConcern[] }) {
  if (concerns.length === 0) return null;
  const copy = HOME_COPY.concerns;

  return (
    <section aria-labelledby="concerns-title" className="bg-surface py-section">
      <Container className="cns-reveal">
        <SectionHeader id="concerns-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ul className="mt-12 grid grid-cols-2 gap-4 tablet:grid-cols-3 desktop:gap-6">
          {concerns.map((concern) => (
            <li key={concern.slug}>
              <Link
                href={`${ROUTES.products}?concern=${encodeURIComponent(concern.slug)}`}
                className="group flex h-full flex-col rounded-lg border border-border bg-background p-5 transition-colors duration-(--duration-base) hover:border-brand-rose-gold desktop:p-6"
              >
                <span className="font-display text-h4 text-text-primary">{concern.label}</span>
                {concern.description && (
                  <span className="mt-2 text-body-s text-text-secondary">{concern.description}</span>
                )}
                <span className="mt-auto flex items-center gap-2 pt-4 text-body-s font-medium text-brand-cocoa">
                  {copy.cardCta}
                  <span className="text-text-secondary">({concern.productCount})</span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-(--duration-base) desktop:group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
