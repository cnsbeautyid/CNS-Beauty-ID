import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { InsightError } from "@/features/admin/insight-error";
import { AdminPageHeader } from "@/features/admin/page-header";
import { requireStaff } from "@/services/admin/auth";
import { CONTENT_STATUS_LABELS, PUBLISH_STATUS_LABELS } from "@/services/admin/model";
import { getContentInsights } from "@/services/admin/insights";

export const metadata = { title: "Konten" };

const SECTIONS = [
  { key: "articles", title: "Artikel jurnal", labels: CONTENT_STATUS_LABELS },
  { key: "blocks", title: "Blok konten halaman", labels: CONTENT_STATUS_LABELS },
  { key: "stories", title: "Cerita pelanggan", labels: CONTENT_STATUS_LABELS },
  { key: "campaigns", title: "Kampanye", labels: PUBLISH_STATUS_LABELS },
] as const;

export default async function AdminContentPage() {
  await requireStaff(ROUTES.admin.content);
  const insights = await getContentInsights();

  return (
    <>
      <AdminPageHeader title="Konten" description="Ringkasan status konten. Pengelolaan artikel dan kampanye menyusul bersama modul Journal." />
      {!insights ? (
        <InsightError href={ROUTES.admin.content} />
      ) : (
        <div className="grid gap-4 tablet:grid-cols-2">
          {SECTIONS.map((section) => {
            const counts = Object.entries(insights[section.key]);
            return (
              <Card as="section" key={section.key} padding="lg" aria-label={section.title}>
                <h2 className="mb-3 text-h4">{section.title}</h2>
                {counts.length === 0 ? (
                  <p className="text-body-s text-text-secondary">Belum ada.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-1 text-body-s">
                    {counts.map(([status, count]) => (
                      <div key={status} className="contents">
                        <dt className="text-text-secondary">{section.labels[status] ?? status}</dt>
                        <dd className="text-right font-medium">{count}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
