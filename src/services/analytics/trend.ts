import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/constants/analytics";

// Long-term trend from anonymous daily totals (analytics_daily_events). Days
// are WIB calendar days as ISO strings; date math runs in UTC on those
// strings, so no local time zone is involved. "Visitors" are summed per day:
// someone who visits on 3 days counts 3 times.

export const TREND_RANGES = [3, 6, 12] as const;
export type TrendRange = (typeof TREND_RANGES)[number];

export type DailyTotal = { day: string; event_name: string; events: number; visitors: number };

export type Trend = {
  from: string;
  to: string;
  weeks: { weekStart: string; pageVisitors: number; orderVisitors: number }[];
  months: {
    month: string;
    events: Partial<Record<AnalyticsEventName, number>>;
    visitors: Partial<Record<AnalyticsEventName, number>>;
    conversion: number | null;
  }[];
};

const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const KNOWN = new Set<string>(ANALYTICS_EVENTS);

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
const mondayOf = (iso: string) => addDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));

export function parseTrendRange(value: string | string[] | undefined): TrendRange {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return (TREND_RANGES as readonly number[]).includes(parsed) ? (parsed as TrendRange) : 6;
}

/** Today's calendar date in WIB (UTC+7, no daylight saving). */
export function wibToday(now: Date = new Date()): string {
  return toIso(new Date(now.getTime() + WIB_OFFSET_MS));
}

/** From the first day of the month `months` months ago, up to yesterday (today is incomplete). */
export function trendRange(todayWib: string, months: TrendRange): { from: string; to: string } {
  const today = toDate(todayWib);
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months, 1));
  return { from: toIso(from), to: addDays(todayWib, -1) };
}

export function buildTrend(rows: DailyTotal[], range: { from: string; to: string }): Trend {
  const weeks = new Map<string, { weekStart: string; pageVisitors: number; orderVisitors: number }>();
  for (let week = mondayOf(range.from); week <= range.to; week = addDays(week, 7)) {
    weeks.set(week, { weekStart: week, pageVisitors: 0, orderVisitors: 0 });
  }

  const months = new Map<string, Trend["months"][number]>();
  const start = toDate(range.from);
  for (let index = 0; ; index++) {
    const month = toIso(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1))).slice(0, 7);
    if (`${month}-01` > range.to) break;
    months.set(month, { month, events: {}, visitors: {}, conversion: null });
  }

  for (const row of rows) {
    if (row.day < range.from || row.day > range.to || !KNOWN.has(row.event_name)) continue;
    const name = row.event_name as AnalyticsEventName;
    const week = weeks.get(mondayOf(row.day));
    if (week && name === "PAGE_VIEWED") week.pageVisitors += row.visitors;
    if (week && name === "ORDER_CREATED") week.orderVisitors += row.visitors;
    const month = months.get(row.day.slice(0, 7));
    if (month) {
      month.events[name] = (month.events[name] ?? 0) + row.events;
      month.visitors[name] = (month.visitors[name] ?? 0) + row.visitors;
    }
  }

  for (const month of months.values()) {
    const pages = month.visitors.PAGE_VIEWED ?? 0;
    month.conversion = pages > 0 ? (month.visitors.ORDER_CREATED ?? 0) / pages : null;
  }

  return { from: range.from, to: range.to, weeks: [...weeks.values()], months: [...months.values()] };
}
