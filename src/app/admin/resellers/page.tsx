import { Handshake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { ApplicationDecision, PartnerControls } from "@/features/admin/partner-controls";
import { formatDate } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { getPartnerOverview } from "@/services/admin/people";
import { APPLICATION_STATUS_LABELS, PARTNER_TYPE_LABELS } from "@/services/reseller/model";

export const metadata = { title: "Reseller" };

export default async function AdminResellersPage() {
  await requireStaff(ROUTES.admin.resellers);
  const overview = await getPartnerOverview();

  if (!overview) {
    return (
      <>
        <AdminPageHeader title="Reseller" />
        <ErrorState
          description="Data partner belum dapat dimuat."
          action={
            <ButtonLink href={ROUTES.admin.resellers} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </>
    );
  }

  const pending = overview.applications.filter((application) => application.status === "pending");
  const decided = overview.applications.filter((application) => application.status !== "pending");

  return (
    <>
      <AdminPageHeader title="Reseller & dropshipper" description="Setujui pendaftaran dan atur level partner. Harga partner mengikuti tabel harga partner per level." />
      <section aria-labelledby="applications-title" className="flex flex-col gap-4">
        <h2 id="applications-title" className="text-h4">
          Pendaftaran menunggu ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-body-s text-text-secondary">Tidak ada pendaftaran yang menunggu.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((application) => (
              <Card as="li" key={application.id} padding="lg" className="grid gap-4 desktop:grid-cols-2">
                <div className="flex flex-col gap-1 text-body-s">
                  <p className="font-medium">
                    {application.fullName} · {PARTNER_TYPE_LABELS[application.memberType]}
                    {application.memberType === "reseller" && ` · minat level ${application.desiredLevel}`}
                  </p>
                  <p className="text-text-secondary">
                    {application.email ?? "—"} · {application.phone}
                  </p>
                  <p className="text-text-secondary">
                    {application.city ?? "—"}
                    {application.storeName && ` · ${application.storeName}`}
                  </p>
                  {application.salesChannel && <p>Kanal: {application.salesChannel}</p>}
                  {application.message && <p className="text-text-secondary">&ldquo;{application.message}&rdquo;</p>}
                  <p className="text-caption text-text-secondary">Dikirim {formatDate(application.createdAt)}</p>
                </div>
                <ApplicationDecision
                  applicationId={application.id}
                  memberType={application.memberType}
                  desiredLevel={application.desiredLevel}
                  storeName={application.storeName}
                />
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="partners-title" className="mt-10 flex flex-col gap-4">
        <h2 id="partners-title" className="text-h4">
          Partner ({overview.partners.length})
        </h2>
        {overview.partners.length === 0 ? (
          <EmptyState className="py-8" icon={<Handshake className="size-8" strokeWidth={1.25} />} title="Belum ada partner" />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
            {overview.partners.map((partner) => (
              <li key={partner.userId} className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
                <div className="text-body-s">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {partner.storeName ?? partner.name ?? partner.email ?? "Partner"}
                    <Badge tone={partner.isActive ? "success" : "neutral"}>{partner.isActive ? "Aktif" : "Nonaktif"}</Badge>
                  </p>
                  <p className="text-text-secondary">
                    {PARTNER_TYPE_LABELS[partner.memberType]}
                    {partner.memberType === "reseller" && ` · Level ${partner.tierLevel}`} · {partner.email ?? "—"}
                  </p>
                  <p className="text-caption text-text-secondary">Disetujui {formatDate(partner.approvedAt)}</p>
                </div>
                <PartnerControls userId={partner.userId} memberType={partner.memberType} tierLevel={partner.tierLevel} isActive={partner.isActive} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section aria-labelledby="history-title" className="mt-10 flex flex-col gap-3">
          <h2 id="history-title" className="text-h4">
            Riwayat pendaftaran
          </h2>
          <ul className="flex flex-col gap-1 text-body-s">
            {decided.map((application) => (
              <li key={application.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
                <span>
                  {application.fullName} · {PARTNER_TYPE_LABELS[application.memberType]}
                </span>
                <span className="text-text-secondary">
                  {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                  {application.reviewedAt && ` · ${formatDate(application.reviewedAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
