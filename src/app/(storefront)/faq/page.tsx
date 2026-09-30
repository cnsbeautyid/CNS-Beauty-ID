import type { Metadata } from "next";
import Link from "next/link";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/structured-data";
import { getPublicFaqs, groupFaqs } from "@/services/content/faqs";

export const revalidate = 300;

const CRUMBS = [
  { name: "Beranda", path: ROUTES.home },
  { name: "FAQ", path: ROUTES.faq },
];

export async function generateMetadata(): Promise<Metadata> {
  const faqs = await getPublicFaqs();
  return {
    title: "Pertanyaan Umum (FAQ)",
    description: "Jawaban atas pertanyaan umum tentang produk, pengiriman, CNS Rewards, dan program reseller CNS Beauty.",
    alternates: { canonical: ROUTES.faq },
    // Nothing to index without approved questions (or when they can't be read).
    robots: !faqs || faqs.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function FaqPage() {
  const faqs = await getPublicFaqs();
  const groups = faqs ? groupFaqs(faqs) : [];
  const faqData = faqPageJsonLd(groups.flatMap((group) => group.items));

  return (
    <main id="main-content">
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      {faqData && <JsonLd data={faqData} />}
      <Container className="py-10 desktop:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">Bantuan</p>
          <h1 className="mt-3 text-h1 text-brand-cocoa-dark">Pertanyaan Umum</h1>

          {!faqs ? (
            <ErrorState description="Pertanyaan umum belum dapat dimuat. Silakan coba lagi nanti atau hubungi tim kami." />
          ) : groups.length === 0 ? (
            <p className="mt-6 text-body text-text-secondary">Belum ada pertanyaan umum.</p>
          ) : (
            <div className="mt-10 flex flex-col gap-10">
              {groups.map((group) => (
                <section key={group.key} aria-labelledby={`faq-${group.key}`}>
                  <h2 id={`faq-${group.key}`} className="text-h3 text-brand-cocoa-dark">
                    {group.label}
                  </h2>
                  <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-background">
                    {group.items.map((faq) => (
                      <details key={faq.id} className="group px-5">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                          {faq.question}
                          <span aria-hidden className="text-text-secondary transition-transform duration-(--duration-base) group-open:rotate-45 motion-reduce:transition-none">
                            +
                          </span>
                        </summary>
                        {/* Plain text only: approved copy, line breaks kept, never HTML. */}
                        <p className="pb-5 text-body-s whitespace-pre-line text-text-secondary">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <section aria-labelledby="faq-more" className="mt-12 rounded-lg bg-ai-surface p-6">
            <h2 id="faq-more" className="text-h4">
              Pertanyaanmu belum terjawab?
            </h2>
            <p className="mt-2 text-body-s text-text-secondary">Tanyakan langsung ke Beauty AI, atau hubungi tim CNS Beauty.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AskAIButton>Tanya Beauty AI</AskAIButton>
              <Link href={ROUTES.contact} className="inline-flex min-h-11 items-center px-2 text-body-s font-medium underline underline-offset-4">
                Hubungi kami
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
