import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { RESELLER_COPY } from "@/content/reseller";
import { ApplicationForm } from "@/features/reseller/application-form";
import { getSessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import { getOwnProfile } from "@/services/account/account";
import { APPLICATION_STATUS_LABELS, PARTNER_TYPE_LABELS } from "@/services/reseller/model";
import { getOwnApplication, getOwnPartner } from "@/services/reseller/reseller";

export const metadata: Metadata = {
  title: "Jadi Reseller",
  description: "Program partner CNS Beauty untuk reseller dan dropshipper: harga partner berjenjang dan portal partner khusus.",
  alternates: { canonical: ROUTES.resellerProgram },
  openGraph: { title: "Jadi Partner CNS Beauty", description: "Daftar sebagai reseller atau dropshipper CNS Beauty." },
};

export default function ResellerProgramPage() {
  const copy = RESELLER_COPY;

  return (
    <main id="main-content">
      <PageHero eyebrow={copy.hero.eyebrow} title={copy.hero.title} description={copy.hero.description}>
        <div className="mt-8">
          <ButtonLink href="#daftar">Daftar sekarang</ButtonLink>
        </div>
      </PageHero>

      <Container className="flex flex-col gap-16 py-section desktop:gap-24">
        <section aria-labelledby="types-title" className="flex flex-col gap-6">
          <h2 id="types-title" className="text-center text-h2 text-brand-cocoa-dark">
            Pilih jenis kemitraan
          </h2>
          <ul className="grid gap-4 tablet:grid-cols-2">
            {copy.types.map((type) => (
              <Card as="li" key={type.id} padding="lg" tone="surface">
                <h3 className="text-h3">{type.title}</h3>
                <p className="mt-2 text-body text-text-secondary">{type.description}</p>
              </Card>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps-title" className="flex flex-col gap-6">
          <h2 id="steps-title" className="text-center text-h2 text-brand-cocoa-dark">
            Cara bergabung
          </h2>
          <ol className="grid gap-6 tablet:grid-cols-3">
            {copy.steps.map((step, index) => (
              <li key={step.id} className="flex flex-col gap-2">
                <span aria-hidden className="font-display text-display-l text-brand-cocoa">
                  {index + 1}
                </span>
                <h3 className="text-h4">{step.title}</h3>
                <p className="text-body-s text-text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>
          <ul className="mx-auto flex max-w-2xl list-disc flex-col gap-1 pl-5 text-body-s text-text-secondary">
            {copy.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section id="daftar" aria-labelledby="apply-title" className="mx-auto flex w-full max-w-2xl scroll-mt-24 flex-col gap-6">
          <h2 id="apply-title" className="text-center text-h2 text-brand-cocoa-dark">
            Formulir pendaftaran
          </h2>
          <ApplicationArea />
        </section>
      </Container>
    </main>
  );
}

/** Sign-in gate, partner/application status, or the form. All reads are the caller's own rows (RLS). */
async function ApplicationArea() {
  const user = await getSessionUser();
  if (!user) {
    const next = encodeURIComponent(ROUTES.resellerProgram);
    return (
      <Card padding="lg" tone="surface" className="flex flex-col items-center gap-4 text-center">
        <p className="text-body text-text-secondary">Masuk atau buat akun CNS Beauty terlebih dahulu untuk mengirim pendaftaran partner.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href={`${ROUTES.signIn}?next=${next}`}>Masuk</ButtonLink>
          <ButtonLink href={`${ROUTES.signUp}?next=${next}`} variant="secondary">
            Buat akun
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const [partner, application, profile] = await Promise.all([getOwnPartner(), getOwnApplication(), getOwnProfile()]);
  if (partner === undefined || application === undefined) {
    return <ErrorState description="Status pendaftaran belum dapat dimuat. Silakan coba lagi dalam beberapa saat." />;
  }

  if (partner) {
    return (
      <Card padding="lg" tone="surface" className="flex flex-col items-center gap-4 text-center">
        <p className="text-body">
          Akunmu terdaftar sebagai <strong>{PARTNER_TYPE_LABELS[partner.memberType]}</strong> CNS Beauty.
        </p>
        <ButtonLink href={ROUTES.resellerPortal.dashboard}>Buka portal partner</ButtonLink>
      </Card>
    );
  }

  if (application && application.status !== "rejected") {
    return (
      <Card padding="lg" tone="surface" className="flex flex-col gap-2 text-center">
        <p role="status" className="text-body font-medium">
          {APPLICATION_STATUS_LABELS[application.status] ?? "Sedang ditinjau"}
        </p>
        <p className="text-body-s text-text-secondary">
          Pendaftaran {PARTNER_TYPE_LABELS[application.memberType]} dikirim {formatDate(application.createdAt)}. Tim CNS Beauty akan menghubungimu
          melalui nomor yang kamu daftarkan.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {application?.status === "rejected" && (
        <p className="rounded-md bg-surface p-4 text-body-s text-text-secondary">
          Pendaftaran sebelumnya belum dapat kami setujui. Kamu dapat mengirim pendaftaran baru.
        </p>
      )}
      <ApplicationForm defaultName={profile?.fullName ?? undefined} />
    </div>
  );
}
