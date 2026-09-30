import { Skeleton } from "@/components/ui/states";
import { InsightError } from "@/features/admin/insight-error";
import { getAnalyticsTrend } from "@/services/admin/analytics";
import type { Trend, TrendRange } from "@/services/analytics/trend";

const W = 640;
const H = 200;
const PAD = 8;

const number = (value: number) => value.toLocaleString("id-ID");
const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);
const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });
const updatedLabel = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

const COLUMNS = [
  { key: "PRODUCT_VIEWED", label: "Produk dilihat" },
  { key: "ADD_TO_CART", label: "Tambah ke keranjang" },
  { key: "CHECKOUT_STARTED", label: "Checkout" },
  { key: "ORDER_CREATED", label: "Pesanan" },
] as const;

function points(values: number[], max: number): string {
  const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  return values.map((value, index) => `${PAD + index * step},${H - PAD - (value / max) * (H - PAD * 2)}`).join(" ");
}

function TrendChart({ trend, months }: { trend: Trend; months: TrendRange }) {
  const pages = trend.weeks.map((week) => week.pageVisitors);
  const orders = trend.weeks.map((week) => week.orderVisitors);
  const max = Math.max(1, ...pages, ...orders);
  const summary = `Tren mingguan ${months} bulan: pengunjung halaman dari ${number(pages[0] ?? 0)} ke ${number(pages.at(-1) ?? 0)}, pengunjung yang memesan dari ${number(orders[0] ?? 0)} ke ${number(orders.at(-1) ?? 0)}.`;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-caption text-text-secondary">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-6 bg-brand-cocoa" /> Pengunjung halaman
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-6 bg-ai-accent" /> Pengunjung yang memesan
        </span>
        <span className="ml-auto">Maks. {number(max)} / minggu</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-48 w-full" preserveAspectRatio="none">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points={points(pages, max)} fill="none" className="stroke-brand-cocoa" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <polyline points={points(orders, max)} fill="none" className="stroke-ai-accent" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex justify-between text-caption text-text-secondary">
        <span>{dayLabel(trend.weeks[0]?.weekStart ?? trend.from)}</span>
        <span>{dayLabel(trend.to)}</span>
      </figcaption>
    </figure>
  );
}

/** Long-term trend from anonymous daily totals. Streams in; the reports above never wait for it. */
export async function TrendSection({ months, errorHref }: { months: TrendRange; errorHref: string }) {
  const result = await getAnalyticsTrend(months);
  if (result.status === "error") return <InsightError href={errorHref} />;
  const { trend, lastUpdated } = result;
  const empty = trend.months.every((month) => Object.keys(month.events).length === 0);

  return (
    <div className="flex flex-col gap-6">
      {empty ? (
        <p className="text-body-s text-text-secondary">Ringkasan harian tersedia setelah proses malam pertama.</p>
      ) : (
        <>
          <TrendChart trend={trend} months={months} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-left text-body-s">
              <caption className="sr-only">Total bulanan dari ringkasan harian</caption>
              <thead className="text-caption text-text-secondary">
                <tr>
                  <th scope="col" className="py-2 font-medium">Bulan</th>
                  <th scope="col" className="py-2 text-right font-medium">Kunjungan</th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className="py-2 text-right font-medium">
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className="py-2 text-right font-medium">Konversi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trend.months.map((month) => (
                  <tr key={month.month}>
                    <th scope="row" className="py-2 font-normal">{monthLabel(month.month)}</th>
                    <td className="py-2 text-right">{number(month.visitors.PAGE_VIEWED ?? 0)}</td>
                    {COLUMNS.map((column) => (
                      <td key={column.key} className="py-2 text-right">{number(month.events[column.key] ?? 0)}</td>
                    ))}
                    <td className="py-2 text-right">{percent(month.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-caption text-text-secondary">
        Pengunjung dihitung per hari lalu dijumlah; satu orang yang datang 3 hari terhitung 3. Data sampai kemarin.
        {lastUpdated && (
          <>
            {" "}
            Ringkasan terakhir diperbarui {updatedLabel(lastUpdated)}; bila tanggal ini tertinggal lebih dari 2 hari, periksa cron{" "}
            <code>analytics-retention</code>.
          </>
        )}
      </p>
    </div>
  );
}

export function TrendSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
