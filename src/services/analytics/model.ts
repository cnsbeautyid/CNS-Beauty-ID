import { z } from "zod";

import { CLIENT_EVENTS, type AnalyticsEventName } from "@/constants/analytics";

// Pure event rules shared by the ingest route, the server recorder and tests.
// Events are PII-minimised: no names, emails, phone numbers, addresses, free
// text beyond a trimmed search term, or full URLs.

const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value.replace(/[^\p{L}\p{N}\s._-]/gu, " ").replace(/\s+/g, " ").trim());
const count = z.number().int().min(0).max(10_000);
const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);

/** Allowed properties per client event. Unknown keys are dropped. */
const CLIENT_PROPERTIES = {
  PAGE_VIEWED: z.object({ pageType: z.string().regex(/^[a-z_]{1,30}$/).optional() }),
  PRODUCT_VIEWED: z.object({ slug: slug.optional() }),
  PRODUCT_SEARCHED: z.object({ query: shortText(60), results: count.optional() }),
  PRODUCT_RECOMMENDATION_VIEWED: z.object({ source: z.enum(["skin_quiz", "routine", "product"]), count: count.optional() }),
  AI_OPENED: z.object({ source: z.enum(["launcher", "header", "ask_button", "page"]).optional() }),
  AI_RECOMMENDATION_VIEWED: z.object({ count: count.optional() }),
  AI_RECOMMENDATION_ACCEPTED: z.object({ slug: slug.optional() }),
  CHECKOUT_STARTED: z.object({ itemCount: count.optional() }),
  SKIN_QUIZ_STARTED: z.object({}),
  LOYALTY_VIEWED: z.object({}),
} satisfies Record<(typeof CLIENT_EVENTS)[number], z.ZodType>;

const utmValue = z
  .string()
  .regex(/^[\w.-]{1,60}$/)
  .optional()
  .catch(undefined);

/** Body of POST /api/analytics. */
export const clientEventSchema = z
  .object({
    name: z.enum(CLIENT_EVENTS),
    properties: z.record(z.string(), z.unknown()).optional().default({}),
    path: z.string().max(2000).optional(),
    referrer: z.string().max(2000).optional(),
    sessionId: z.uuid().optional(),
    productId: z.uuid().optional(),
    aiConversationId: z.uuid().optional(),
    utm: z.object({ source: utmValue, medium: utmValue, campaign: utmValue }).optional(),
  })
  .transform((event, ctx) => {
    const properties = CLIENT_PROPERTIES[event.name].safeParse(event.properties);
    if (!properties.success) {
      ctx.addIssue({ code: "custom", message: "invalid_properties" });
      return z.NEVER;
    }
    return { ...event, properties: properties.data as Record<string, string | number> };
  });

export type ClientEvent = z.output<typeof clientEventSchema>;

const ORDER_NUMBER = /^CNS-[\w-]+$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pathname only, with identifiers collapsed: no query string, no fragment,
 * no order numbers or ids (they would tie an event to one order/person).
 * Returns null for staff pages and anything that isn't a same-site path.
 */
export function normalizePath(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let pathname: string;
  try {
    pathname = new URL(raw, "https://cns.invalid").pathname;
  } catch {
    return null;
  }
  if (!pathname.startsWith("/") || isStaffOrApiPath(pathname)) return null;
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const decoded = safeDecode(segment);
      if (UUID.test(decoded) || ORDER_NUMBER.test(decoded) || /^\d{4,}$/.test(decoded)) return ":id";
      return decoded.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 80) || ":id";
    });
  return `/${segments.join("/")}`.slice(0, 300);
}

/** `/admin…` and `/api…` segments (staff pages and endpoints are never tracked). */
export function isStaffOrApiPath(pathname: string): boolean {
  return /^\/(admin|api)(\/|$)/.test(pathname);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** External referrer host only (e.g. `instagram.com`); null for same-site or invalid. */
export function referrerHost(referrer: string | undefined | null, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === ownHost.toLowerCase().replace(/^www\./, "")) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

/** Do Not Track or Global Privacy Control: record no visitor identity. */
export function isOptedOut(headers: Pick<Headers, "get">): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export type ServerEventInput = {
  properties?: Record<string, string | number | boolean | null | undefined>;
  productId?: string | null;
  orderId?: string | null;
  aiConversationId?: string | null;
};

/** Drops undefined values and caps string length so server properties stay small. */
export function compactProperties(properties: ServerEventInput["properties"] = {}): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    result[key.slice(0, 40)] = typeof value === "string" ? value.slice(0, 120) : value;
  }
  return result;
}


export const REPORT_WINDOWS = [7, 30, 90] as const;
export type ReportWindow = (typeof REPORT_WINDOWS)[number];

/** `?hari=` → 7, 30 or 90 (default 30). */
export function parseReportWindow(value: string | string[] | undefined): ReportWindow {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return (REPORT_WINDOWS as readonly number[]).includes(raw) ? (raw as ReportWindow) : 30;
}

export type FunnelStep = { event: AnalyticsEventName; visitors: number; fromPrevious: number | null; fromStart: number | null };

/** Funnel rows (from analytics_funnel) → steps with step-to-step and overall rates. */
export function buildFunnel(steps: readonly AnalyticsEventName[], rows: { event_name: string; visitors: number }[]): FunnelStep[] {
  const byName = new Map(rows.map((row) => [row.event_name, Number(row.visitors)]));
  const first = byName.get(steps[0] ?? "") ?? 0;
  return steps.map((event, index) => {
    const visitors = byName.get(event) ?? 0;
    const previous = index === 0 ? null : (byName.get(steps[index - 1] ?? "") ?? 0);
    return {
      event,
      visitors,
      fromPrevious: previous === null ? null : previous > 0 ? visitors / previous : null,
      fromStart: index === 0 ? null : first > 0 ? visitors / first : null,
    };
  });
}

/** Most frequent non-empty values, highest first. */
export function topValues(values: (string | null | undefined)[], limit = 10): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw?.trim().toLowerCase();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}
