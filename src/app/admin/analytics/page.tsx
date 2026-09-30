import { ROUTES } from "@/constants/routes";
import { InsightError } from "@/features/admin/insight-error";
import { AdminPageHeader } from "@/features/admin/page-header";
import { requireStaff } from "@/services/admin/auth";
import { getAnalyticsInsights } from "@/services/admin/insights";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireStaff(ROUTES.admin.analytics);
  const insights = await getAnalyticsInsights();

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Event perilaku 30 hari terakhir. Pencatatan event di storefront (PAGE_VIEWED, ADD_TO_CART, dll.) dan funnel konversi dibangun di Phase 16."
      />
      {!insights ? (
        <InsightError href={ROUTES.admin.analytics} />
      ) : insights.total30d === 0 ? (
        <p className="rounded-lg border border-border bg-background p-6 text-body-s text-text-secondary">Belum ada event analytics yang tercatat.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-left text-body-s">
            <caption className="sr-only">Jumlah event per nama</caption>
            <thead className="border-b border-border text-caption text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Event</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {insights.byEvent.map((event) => (
                <tr key={event.name}>
                  <td className="px-4 py-3 font-mono text-caption">{event.name}</td>
                  <td className="px-4 py-3 text-right">{event.count.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
