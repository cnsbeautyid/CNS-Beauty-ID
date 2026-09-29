import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Container } from "./container";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Optional visual (e.g. ArchMedia); switches to a two-column layout. */
  media?: ReactNode;
  children?: ReactNode;
};

/** Top-of-page heading block for brand and content pages. Holds the page's h1. */
export function PageHero({ eyebrow, title, subtitle, description, media, children }: PageHeroProps) {
  return (
    <section aria-labelledby="page-title" className="bg-brand-cream">
      <Container
        className={cn(
          "py-section",
          media ? "grid items-center gap-12 desktop:grid-cols-2 desktop:gap-16" : "flex flex-col items-center text-center",
        )}
      >
        <div className={cn("flex flex-col", media ? "items-start" : "items-center")}>
          <p className="flex items-center gap-3 text-caption tracking-eyebrow text-brand-cocoa uppercase">
            <span aria-hidden className="h-px w-8 bg-brand-gold" />
            {eyebrow}
          </p>
          <h1 id="page-title" className="mt-5 max-w-3xl text-display-l text-brand-cocoa-dark">
            {title}
          </h1>
          {subtitle && <p className="mt-3 font-display text-h3 text-brand-cocoa italic">{subtitle}</p>}
          {description && <p className="mt-6 max-w-2xl text-body-l text-text-secondary">{description}</p>}
          {children}
        </div>
        {media}
      </Container>
    </section>
  );
}
