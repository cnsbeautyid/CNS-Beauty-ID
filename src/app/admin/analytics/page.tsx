import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ANALYTICS_EVENT_LABELS, type AnalyticsEventName } from "@/constants/analytics";
import { ROUTES } from "@/constants/routes";
import { FunnelChart } from "@/features/admin/funnel-chart";
import { InsightError } from "@/features/admin/insight-error";
import { AdminPageHeader } from "@/features/admin/page-header";
import { cn } from "@/lib/utils/cn";
import { getAnalyticsReport } from "@/services/admin/analytics";
import { requireStaff } from "@/services/admin/auth";
import { parseReportWindow, REPORT_WINDOWS } from "@/services/analytics/model";

export const metadata = { title: "Analytics" };

const label = (name: string) => ANALYTICS_EVENT_LABELS[name as AnalyticsEventName] ?? name;

function RankedList({ title, items, empty }: { title: string; items: { value: string; count: number }[]; empty: string }) {
  return (
    <Card as="section" padding="lg" aria-label={title}>
      <h2 className="mb-3 text-h4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-body-s text-text-secondary">{empty}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border text-body-s">
          {items.map((item) => (
            <li key={item.value} className="flex justify-between gap-4 py-2">
              <span className="min-w-0 break-words">{item.value}</span>
              <span className="font-medium">{item.count.toLocaleString("id-ID")}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireStaff(ROUTES.admin.analytics);
  const days = parseReportWindow((await searchParams).hari);
  const report = await getAnalyticsReport(days);
  const href = (window: number) => (window === 30 ? ROUTES.admin.analytics : `${ROUTES.admin.analytics}?hari=${window}`);

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Pengunjung unik per tahap, dari event first-party yang dicatat server. Tanpa pihak ketiga; pengunjung dengan Do Not Track / GPC tidak dihitung."
        action={
          <nav aria-label="Periode" className="flex gap-1 rounded-md border border-border bg-background p-1">
            {REPORT_WINDOWS.map((window) => (
              <Link
                key={window}
                href={href(window)}
                aria-current={window === days ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-sm px-3 text-body-s",
                  window === days ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {window} hari
              </Link>
            ))}
          </nav>
        }
      />
      {!report ? (
        <InsightError href={href(days)} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 desktop:grid-cols-2">
            <FunnelChart title="Funnel utama" steps={report.primary} />
            <FunnelChart title="Funnel Beauty AI" steps={report.ai} />
            <FunnelChart title="Funnel Skin Quiz" steps={report.quiz} />
            <Card as="section" padding="lg" aria-labelledby="events-title">
              <h2 id="events-title" className="mb-3 text-h4">
                Semua event
              </h2>
              {report.events.length === 0 ? (
                <p className="text-body-s text-text-secondary">Belum ada event pada periode ini.</p>
              ) : (
                <table className="w-full text-left text-body-s">
                  <caption className="sr-only">Jumlah event dan pengunjung unik per event</caption>
                  <thead className="text-caption text-text-secondary">
                    <tr>
                      <th scope="col" className="py-2 font-medium">Event</th>
                      <th scope="col" className="py-2 text-right font-medium">Event</th>
                      <th scope="col" className="py-2 text-right font-medium">Pengunjung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.events.map((event) => (
                      <tr key={event.name}>
                        <td className="py-2">
                          {label(event.name)}
                          <span className="block font-mono text-caption text-text-secondary">{event.name}</span>
                        </td>
                        <td className="py-2 text-right">{event.events.toLocaleString("id-ID")}</td>
                        <td className="py-2 text-right">{event.visitors.toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
          <div className="grid gap-6 tablet:grid-cols-2">
            <RankedList title="Pencarian teratas" items={report.searches} empty="Belum ada pencarian." />
            <RankedList title="Sumber kunjungan" items={report.sources} empty="Belum ada kunjungan." />
          </div>
          <p className="text-caption text-text-secondary">
            Funnel menghitung pengunjung yang mencapai semua tahap sebelumnya dalam periode ini, tanpa memperhatikan urutan waktu. Satu pengunjung = satu ID anonim
            first-party (atau akun bila ID tidak tersedia).
          </p>
        </div>
      )}
    </>
  );
}
