import { describe, expect, it } from "vitest";

import { buildTrend, parseTrendRange, trendRange, wibToday, type DailyTotal } from "@/services/analytics/trend";

const row = (day: string, event_name: string, events: number, visitors: number): DailyTotal => ({ day, event_name, events, visitors });

describe("trend range", () => {
  it("parses ?tren with a default of 6 months", () => {
    expect(parseTrendRange("3")).toBe(3);
    expect(parseTrendRange("12")).toBe(12);
    expect(parseTrendRange(undefined)).toBe(6);
    expect(parseTrendRange("5")).toBe(6);
    expect(parseTrendRange(["12", "3"])).toBe(12);
  });

  it("covers whole months up to yesterday", () => {
    expect(trendRange("2026-09-30", 3)).toEqual({ from: "2026-06-01", to: "2026-09-29" });
    expect(trendRange("2026-01-01", 6)).toEqual({ from: "2025-07-01", to: "2025-12-31" });
  });

  it("uses the WIB calendar day", () => {
    // 2026-09-30 18:00 UTC is 01:00 on 2026-10-01 in WIB.
    expect(wibToday(new Date("2026-09-30T18:00:00Z"))).toBe("2026-10-01");
    expect(wibToday(new Date("2026-09-30T16:59:00Z"))).toBe("2026-09-30");
  });
});

describe("buildTrend", () => {
  const range = { from: "2026-09-01", to: "2026-09-30" };
  const rows = [
    row("2026-09-07", "PAGE_VIEWED", 10, 4), // Monday
    row("2026-09-13", "PAGE_VIEWED", 5, 3), // Sunday: same week as 09-07
    row("2026-09-13", "ORDER_CREATED", 1, 1),
    row("2026-09-21", "PAGE_VIEWED", 2, 2),
    row("2026-10-01", "PAGE_VIEWED", 99, 99), // outside the range
    row("2026-08-30", "PAGE_VIEWED", 99, 99), // outside the range
  ];

  it("groups Monday-start weeks, Sundays included, and fills empty weeks with 0", () => {
    expect(buildTrend(rows, range).weeks).toEqual([
      { weekStart: "2026-08-31", pageVisitors: 0, orderVisitors: 0 },
      { weekStart: "2026-09-07", pageVisitors: 7, orderVisitors: 1 },
      { weekStart: "2026-09-14", pageVisitors: 0, orderVisitors: 0 },
      { weekStart: "2026-09-21", pageVisitors: 2, orderVisitors: 0 },
      { weekStart: "2026-09-28", pageVisitors: 0, orderVisitors: 0 },
    ]);
  });

  it("sums months and computes conversion from summed daily visitors", () => {
    const [september] = buildTrend(rows, range).months;
    expect(september).toMatchObject({
      month: "2026-09",
      events: { PAGE_VIEWED: 17, ORDER_CREATED: 1 },
      visitors: { PAGE_VIEWED: 9, ORDER_CREATED: 1 },
    });
    expect(september?.conversion).toBeCloseTo(1 / 9);
  });

  it("has no conversion for a month without page visitors, and lists every month in range", () => {
    const trend = buildTrend([row("2026-08-10", "ORDER_CREATED", 1, 1)], { from: "2026-07-01", to: "2026-08-31" });
    expect(trend.months.map((month) => [month.month, month.conversion])).toEqual([
      ["2026-07", null],
      ["2026-08", null],
    ]);
  });

  it("ignores unknown event names", () => {
    const trend = buildTrend([row("2026-09-02", "LEGACY_THING", 3, 3)], range);
    expect(trend.months[0]?.events).toEqual({});
  });
});
