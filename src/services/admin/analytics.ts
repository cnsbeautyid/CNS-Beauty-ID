import "server-only";

import { AI_FUNNEL, PRIMARY_FUNNEL, SKIN_QUIZ_FUNNEL, type AnalyticsEventName } from "@/constants/analytics";
import { createClient } from "@/lib/supabase/server";
import { buildFunnel, topValues, type FunnelStep, type ReportWindow } from "@/services/analytics/model";
import { buildTrend, trendRange, wibToday, type DailyTotal, type Trend, type TrendRange } from "@/services/analytics/trend";

// Analytics reports for staff. Aggregates run in SQL (analytics_funnel,
// analytics_event_counts: SECURITY INVOKER, so staff RLS applies); only the
// search-term and traffic-source lists read rows, capped per window.

const SAMPLE = 2000;

export type AnalyticsReport = {
  days: ReportWindow;
  events: { name: string; events: number; visitors: number }[];
  primary: FunnelStep[];
  ai: FunnelStep[];
  quiz: FunnelStep[];
  searches: { value: string; count: number }[];
  sources: { value: string; count: number }[];
};

const sinceFor = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export async function getAnalyticsReport(days: ReportWindow): Promise<AnalyticsReport | null> {
  const db = await createClient();
  const since = sinceFor(days);
  const funnel = (steps: readonly AnalyticsEventName[]) => db.rpc("analytics_funnel", { p_steps: [...steps], p_since: since });

  const [counts, primary, ai, quiz, searches, sources] = await Promise.all([
    db.rpc("analytics_event_counts", { p_since: since }),
    funnel(PRIMARY_FUNNEL),
    funnel(AI_FUNNEL),
    funnel(SKIN_QUIZ_FUNNEL),
    db.from("analytics_events").select("properties").eq("event_name", "PRODUCT_SEARCHED").gte("created_at", since).order("created_at", { ascending: false }).limit(SAMPLE),
    db.from("analytics_events").select("utm_source, referrer").eq("event_name", "PAGE_VIEWED").gte("created_at", since).order("created_at", { ascending: false }).limit(SAMPLE),
  ]);
  const failed = [counts, primary, ai, quiz, searches, sources].find((result) => result.error);
  if (failed) {
    console.error("[admin] analytics report failed", failed.error);
    return null;
  }

  return {
    days,
    events: (counts.data ?? []).map((row) => ({ name: row.event_name, events: Number(row.events), visitors: Number(row.visitors) })),
    primary: buildFunnel(PRIMARY_FUNNEL, primary.data ?? []),
    ai: buildFunnel(AI_FUNNEL, ai.data ?? []),
    quiz: buildFunnel(SKIN_QUIZ_FUNNEL, quiz.data ?? []),
    searches: topValues(
      (searches.data ?? []).map((row) => {
        const query = (row.properties as Record<string, unknown> | null)?.query;
        return typeof query === "string" ? query : null;
      }),
    ),
    sources: topValues((sources.data ?? []).map((row) => (row.utm_source ? `utm: ${row.utm_source}` : row.referrer ? row.referrer : "langsung"))),
  };
}

/** Visit-to-order conversion: visitors who created an order ÷ visitors who viewed a page. Null without visitors. */
export async function getConversionRate(days: number): Promise<number | null | undefined> {
  const db = await createClient();
  const { data, error } = await db.rpc("analytics_funnel", { p_steps: ["PAGE_VIEWED", "ORDER_CREATED"], p_since: sinceFor(days) });
  if (error) {
    console.error("[admin] conversion failed", error);
    return undefined;
  }
  const [visits, orders] = buildFunnel(["PAGE_VIEWED", "ORDER_CREATED"], data ?? []);
  return visits && visits.visitors > 0 ? (orders?.visitors ?? 0) / visits.visitors : null;
}

// PostgREST returns at most 1000 rows per request (supabase/config.toml
// max_rows), so the daily totals are read page by page.
const TREND_PAGE_SIZE = 1000;

/**
 * Long-term trend from anonymous daily totals (staff RLS). Up to yesterday, WIB.
 * `lastUpdated` is when the nightly job last wrote totals, so staff can see if
 * it has stopped running.
 */
export async function getAnalyticsTrend(
  months: TrendRange,
): Promise<{ status: "ok"; trend: Trend; lastUpdated: string | null } | { status: "error" }> {
  const db = await createClient();
  const range = trendRange(wibToday(), months);
  const rows: DailyTotal[] = [];
  let lastUpdated: string | null = null;
  for (let from = 0; ; from += TREND_PAGE_SIZE) {
    const { data, error } = await db
      .from("analytics_daily_events")
      .select("day, event_name, events, visitors, updated_at")
      .gte("day", range.from)
      .lte("day", range.to)
      .order("day")
      .order("event_name")
      .range(from, from + TREND_PAGE_SIZE - 1);
    if (error) {
      console.error("[admin] analytics trend failed", error);
      return { status: "error" };
    }
    for (const row of data ?? []) {
      rows.push(row);
      if (!lastUpdated || row.updated_at > lastUpdated) lastUpdated = row.updated_at;
    }
    if ((data ?? []).length < TREND_PAGE_SIZE) break;
  }
  return { status: "ok", trend: buildTrend(rows, range), lastUpdated };
}
