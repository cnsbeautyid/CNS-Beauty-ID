import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { ConciergeChat } from "@/features/beauty-concierge/concierge-chat";
import { ConciergePageContext } from "@/features/beauty-concierge/concierge-page-context";
import { ConciergeRail, ConciergeRailSkeleton } from "@/features/beauty-concierge/concierge-rail";

export const metadata: Metadata = {
  title: "Beauty Concierge",
  description:
    "Konsultasi perawatan kulit dengan CNS Beauty AI: kenali kebutuhan kulitmu, temukan produk yang sesuai, dan susun rutinitas harian.",
  alternates: { canonical: ROUTES.beautyConcierge },
  openGraph: {
    title: "Beauty Concierge CNS Beauty",
    description: "Tanyakan kebutuhan kulitmu dan dapatkan saran perawatan dari CNS Beauty AI.",
  },
};

const STEPS = [
  { title: "Ceritakan kebutuhan kulitmu", body: "Tulis keluhan atau tujuan perawatanmu dengan bahasamu sendiri." },
  { title: "Saran dari katalog resmi", body: "Produk, harga, dan stok diambil langsung dari katalog CNS Beauty, bukan dikarang." },
  { title: "Lanjutkan bersama tim kami", body: "Butuh bantuan lebih? Beauty AI dapat menghubungkanmu dengan tim CNS Beauty lewat WhatsApp." },
] as const;

export default function BeautyConciergePage() {
  return (
    <main id="main-content">
      <ConciergePageContext />
      <Container className="py-8 desktop:py-12">
        {/* Desktop: intro and rail share the left column so the chat starts at the top and its input is visible without scrolling. */}
        <div className="grid gap-6 desktop:grid-cols-3 desktop:items-start desktop:gap-8">
          <div className="flex flex-col gap-6 desktop:sticky desktop:top-24">
            <div className="max-w-2xl">
              <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">CNS Beauty AI</p>
              <h1 className="mt-3 text-h1 text-brand-cocoa-dark">Beauty Concierge</h1>
              <p className="mt-3 text-body text-text-secondary">
                Ceritakan kebutuhan kulitmu, dan Beauty AI membantu menemukan produk serta rutinitas CNS Beauty yang sesuai. Beauty AI
                memberi saran perawatan, bukan diagnosis medis.
              </p>
            </div>
            <aside aria-label="Profil kecantikanmu">
              <Suspense fallback={<ConciergeRailSkeleton />}>
                <ConciergeRail />
              </Suspense>
            </aside>
          </div>
          <div className="min-w-0 desktop:col-span-2">
            <ConciergeChat />
          </div>
        </div>

        <section aria-labelledby="cara-kerja" className="mt-16">
          <h2 id="cara-kerja" className="text-h2 text-brand-cocoa-dark">
            Cara kerja
          </h2>
          <ol className="mt-6 grid gap-6 tablet:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span aria-hidden className="font-display text-h3 text-ai-accent">
                  {index + 1}
                </span>
                <h3 className="font-display text-h4">{step.title}</h3>
                <p className="text-body-s text-text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </main>
  );
}
