import { ANALYTICS_EVENT_LABELS } from "@/constants/analytics";
import type { FunnelStep } from "@/services/analytics/model";

const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);

/** Horizontal funnel: unique visitors per step, bar width relative to the first step. */
export function FunnelChart({ title, steps }: { title: string; steps: FunnelStep[] }) {
  const top = steps[0]?.visitors ?? 0;
  return (
    <section aria-label={title} className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-4 text-h4">{title}</h2>
      {top === 0 ? (
        <p className="text-body-s text-text-secondary">Belum ada pengunjung di tahap pertama pada periode ini.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step.event} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-body-s">
                <span>
                  <span className="text-text-secondary">{index + 1}.</span> {ANALYTICS_EVENT_LABELS[step.event]}
                </span>
                <span>
                  <span className="font-medium">{step.visitors.toLocaleString("id-ID")}</span>
                  {index > 0 && <span className="text-caption text-text-secondary"> · {percent(step.fromPrevious)} dari tahap sebelumnya</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-secondary" aria-hidden>
                <div className="h-full rounded-pill bg-brand-cocoa" style={{ width: `${top > 0 ? Math.max((step.visitors / top) * 100, step.visitors > 0 ? 1 : 0) : 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {top > 0 && steps.length > 1 && (
        <p className="mt-4 text-caption text-text-secondary">Konversi keseluruhan: {percent(steps.at(-1)?.fromStart ?? null)}</p>
      )}
    </section>
  );
}
