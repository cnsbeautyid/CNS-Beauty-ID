import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { InsightError } from "@/features/admin/insight-error";
import { AdminPageHeader } from "@/features/admin/page-header";
import { formatDateTime } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { getAIInsights } from "@/services/admin/insights";

export const metadata = { title: "AI" };

export default async function AdminAIPage() {
  await requireStaff(ROUTES.admin.ai);
  const insights = await getAIInsights();

  return (
    <>
      <AdminPageHeader
        title="Beauty AI"
        description="Ringkasan 30 hari. Jawaban AI memakai tool terkontrol dan knowledge yang disetujui; isi percakapan tidak ditampilkan di sini."
      />
      {!insights ? (
        <InsightError href={ROUTES.admin.ai} />
      ) : (
        <>
          <dl className="grid gap-4 tablet:grid-cols-3 desktop:grid-cols-5">
            {[
              ["Percakapan", insights.conversations30d],
              ["Dialihkan ke tim", insights.escalations30d],
              ["Ditandai keamanan", insights.safetyFlagged30d],
              ["Rekomendasi (Skin Quiz)", insights.recommendations30d],
              ["Pesanan dari AI", insights.aiOrders30d],
            ].map(([label, value]) => (
              <Card key={label} padding="md">
                <dt className="text-caption text-text-secondary">{label}</dt>
                <dd className="mt-1 font-display text-h3 text-brand-cocoa-dark">{Number(value).toLocaleString("id-ID")}</dd>
              </Card>
            ))}
          </dl>
          <section aria-labelledby="escalations-title" className="mt-10">
            <h2 id="escalations-title" className="mb-3 text-h4">
              Permintaan bantuan tim terbaru
            </h2>
            {insights.recentEscalations.length === 0 ? (
              <p className="text-body-s text-text-secondary">Belum ada percakapan yang dialihkan ke tim.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background text-body-s">
                {insights.recentEscalations.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                    <span>{item.reason}</span>
                    <span className="text-caption text-text-secondary">
                      {formatDateTime(item.startedAt)} · {item.signedIn ? "pelanggan masuk" : "tamu"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
