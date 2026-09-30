import { AtSign, Mail, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClassName } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { getPublicContact } from "@/services/content/contact";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi tim CNS Beauty lewat WhatsApp, Instagram, atau email untuk pertanyaan produk, pesanan, dan kerja sama.",
  alternates: { canonical: ROUTES.contact },
};

const CRUMBS = [
  { name: "Beranda", path: ROUTES.home },
  { name: "Kontak", path: ROUTES.contact },
];

export default async function ContactPage() {
  const contact = await getPublicContact();
  const handle = contact?.instagram?.replace(/^@/, "");
  const hasAny = Boolean(contact?.whatsapp || handle || contact?.email);
  const place = [contact?.city, contact?.region].filter(Boolean).join(", ");

  return (
    <main id="main-content">
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <Container className="py-10 desktop:py-16">
        <div className="mx-auto max-w-2xl">
          <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">Bantuan</p>
          <h1 className="mt-3 text-h1 text-brand-cocoa-dark">Kontak</h1>
          <p className="mt-3 text-body text-text-secondary">Tim CNS Beauty siap membantu pertanyaan produk, pesanan, dan kerja sama.</p>

          {hasAny ? (
            <ul className="mt-8 flex flex-col gap-4">
              {contact?.whatsapp && (
                <li>
                  <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className={buttonClassName({ variant: "primary", size: "lg" })}>
                    <MessageCircle aria-hidden className="size-5" />
                    WhatsApp <span className="whitespace-nowrap">{contact.whatsapp_display ?? `+${contact.whatsapp}`}</span>
                    <span className="sr-only">(membuka WhatsApp)</span>
                  </a>
                </li>
              )}
              {handle && (
                <li>
                  <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-3 text-body underline underline-offset-4">
                    <AtSign aria-hidden className="size-5 text-text-secondary" />@{handle}
                    <span className="sr-only">(Instagram, membuka tab baru)</span>
                  </a>
                </li>
              )}
              {contact?.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="inline-flex min-h-11 items-center gap-3 text-body underline underline-offset-4">
                    <Mail aria-hidden className="size-5 text-text-secondary" />
                    {contact.email}
                  </a>
                </li>
              )}
              {place && (
                <li className="inline-flex min-h-11 items-center gap-3 text-body text-text-secondary">
                  <MapPin aria-hidden className="size-5" />
                  {place}
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-8 text-body text-text-secondary">Kontak belum tersedia.</p>
          )}

          <section aria-labelledby="contact-more" className="mt-12 rounded-lg bg-ai-surface p-6">
            <h2 id="contact-more" className="text-h4">
              Butuh jawaban cepat?
            </h2>
            <p className="mt-2 text-body-s text-text-secondary">Beauty AI bisa membantu memilih produk dan menjawab pertanyaan umum.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AskAIButton>Tanya Beauty AI</AskAIButton>
              <Link href={ROUTES.faq} className="inline-flex min-h-11 items-center px-2 text-body-s font-medium underline underline-offset-4">
                Lihat pertanyaan umum
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
