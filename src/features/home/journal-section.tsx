import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { ButtonLink } from "@/components/ui/button";
import { articlePath, ROUTES } from "@/constants/routes";
import { HOME_COPY } from "@/content/home";
import { formatDate } from "@/lib/utils/format";
import type { ArticleSummary } from "@/types/content";

/** Published articles only. Renders nothing when there are none. */
export function JournalSection({ articles }: { articles: readonly ArticleSummary[] }) {
  if (articles.length === 0) return null;
  const copy = HOME_COPY.journal;

  return (
    <section aria-labelledby="journal-title" className="bg-surface py-section">
      <Container className="cns-reveal">
        <SectionHeader
          id="journal-title"
          align="start"
          eyebrow={copy.eyebrow}
          title={copy.title}
          action={
            <ButtonLink href={ROUTES.journal} variant="secondary">
              {copy.cta}
            </ButtonLink>
          }
        />
        <ul className="mt-12 grid gap-8 tablet:grid-cols-2 desktop:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <article className="group relative flex flex-col">
                <div className="relative aspect-3/2 overflow-hidden rounded-lg bg-brand-beige">
                  {article.cover && (
                    <Image
                      src={article.cover.src}
                      alt={article.cover.alt}
                      fill
                      sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
                      className="object-cover transition-transform duration-(--duration-section) ease-standard desktop:group-hover:scale-103"
                    />
                  )}
                </div>
                <p className="mt-4 flex gap-2 text-caption tracking-wider text-text-secondary uppercase">
                  {article.category && <span>{article.category}</span>}
                  {article.category && <span aria-hidden>·</span>}
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                </p>
                <h3 className="mt-2 text-h4">
                  <Link
                    href={articlePath(article.slug)}
                    className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-primary"
                  >
                    {article.title}
                  </Link>
                </h3>
                {article.excerpt && <p className="mt-2 line-clamp-2 text-body-s text-text-secondary">{article.excerpt}</p>}
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
