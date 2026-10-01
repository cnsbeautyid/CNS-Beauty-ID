import { beforeEach, describe, expect, it, vi } from "vitest";

// getAnalyticsTrend against a fake PostgREST that, like the real one
// (supabase/config.toml max_rows = 1000), never returns more than 1000 rows.

vi.mock("server-only", () => ({}));

const CAP = 1000;
const db = vi.hoisted(() => ({ rows: [] as { day: string; event_name: string; events: number; visitors: number; updated_at: string }[] }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const query = {
        select: () => query,
        gte: () => query,
        lte: () => query,
        order: () => query,
        limit: async (n: number) => ({ data: db.rows.slice(0, Math.min(n, CAP)), error: null }),
        range: async (from: number, to: number) => ({ data: db.rows.slice(from, Math.min(to + 1, from + CAP)), error: null }),
      };
      return query;
    },
  }),
}));

import { getAnalyticsTrend } from "@/services/admin/analytics";
import { trendRange, wibToday } from "@/services/analytics/trend";

describe("getAnalyticsTrend", () => {
  beforeEach(() => {
    const { from } = trendRange(wibToday(), 12);
    const start = new Date(`${from}T00:00:00Z`).getTime();
    // 2,500 rows: 125 days × 20 event rows, 1 page view visitor each on PAGE_VIEWED rows.
    db.rows = Array.from({ length: 2500 }, (_, index) => ({
      day: new Date(start + Math.floor(index / 20) * 86_400_000).toISOString().slice(0, 10),
      event_name: index % 20 === 0 ? "PAGE_VIEWED" : "PRODUCT_VIEWED",
      events: 1,
      visitors: 1,
      updated_at: index === 1234 ? "2026-09-29T18:30:05Z" : "2026-09-01T18:30:00Z",
    }));
  });

  it("reads every daily row, past the 1000-row API cap", async () => {
    const result = await getAnalyticsTrend(12);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const pageViews = result.trend.months.reduce((sum, month) => sum + (month.events.PAGE_VIEWED ?? 0), 0);
    const productViews = result.trend.months.reduce((sum, month) => sum + (month.events.PRODUCT_VIEWED ?? 0), 0);
    expect(pageViews + productViews).toBe(2500);
  });

  it("reports when the daily totals were last updated", async () => {
    const result = await getAnalyticsTrend(12);
    expect(result.status === "ok" && result.lastUpdated).toBe("2026-09-29T18:30:05Z");
  });
});
