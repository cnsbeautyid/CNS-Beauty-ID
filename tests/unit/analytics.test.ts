import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { AI_FUNNEL, ANALYTICS_EVENTS, CLIENT_EVENTS, PRIMARY_FUNNEL } from "@/constants/analytics";
import { assignAnonymousId } from "@/lib/analytics/anonymous-id";
import {
  buildFunnel,
  clientEventSchema,
  compactProperties,
  isOptedOut,
  normalizePath,
  parseReportWindow,
  referrerHost,
  topValues,
} from "@/services/analytics/model";

const ID = "11111111-1111-4111-8111-111111111111";

describe("event vocabulary", () => {
  it("matches CLAUDE.md §14 and keeps state-changing events server-only", () => {
    expect(ANALYTICS_EVENTS).toHaveLength(20);
    for (const name of CLIENT_EVENTS) expect(ANALYTICS_EVENTS).toContain(name);
    for (const serverOnly of ["ADD_TO_CART", "REMOVE_FROM_CART", "ORDER_CREATED", "PAYMENT_STARTED", "ORDER_DELIVERED", "VOUCHER_APPLIED", "AI_MESSAGE_SENT"]) {
      expect(CLIENT_EVENTS).not.toContain(serverOnly);
    }
    for (const step of [...PRIMARY_FUNNEL, ...AI_FUNNEL]) expect(ANALYTICS_EVENTS).toContain(step);
  });
});

describe("clientEventSchema", () => {
  it("accepts client events and drops unknown properties", () => {
    const event = clientEventSchema.parse({ name: "PAGE_VIEWED", properties: { pageType: "shop", email: "a@b.co" }, sessionId: ID });
    expect(event.properties).toEqual({ pageType: "shop" });
  });

  it("rejects server-only and unknown events", () => {
    for (const name of ["ADD_TO_CART", "ORDER_CREATED", "page_view", "HACKED"]) expect(clientEventSchema.safeParse({ name }).success).toBe(false);
  });

  it("validates per-event properties", () => {
    expect(clientEventSchema.safeParse({ name: "PRODUCT_RECOMMENDATION_VIEWED", properties: { source: "email" } }).success).toBe(false);
    expect(clientEventSchema.safeParse({ name: "PRODUCT_VIEWED", properties: { slug: "../etc" } }).success).toBe(false);
    expect(clientEventSchema.safeParse({ name: "PRODUCT_SEARCHED", properties: {} }).success).toBe(false);
  });

  it("strips markup from search terms and caps them", () => {
    const event = clientEventSchema.parse({ name: "PRODUCT_SEARCHED", properties: { query: " <b>serum</b> glow!! ", results: 3 } });
    expect(event.properties).toEqual({ query: "b serum b glow", results: 3 });
    expect(clientEventSchema.safeParse({ name: "PRODUCT_SEARCHED", properties: { query: "x".repeat(61) } }).success).toBe(false);
  });

  it("drops malformed campaign tags instead of failing", () => {
    const event = clientEventSchema.parse({ name: "PAGE_VIEWED", utm: { source: "instagram", campaign: "<script>" } });
    expect(event.utm).toEqual({ source: "instagram", medium: undefined, campaign: undefined });
  });
});

describe("normalizePath", () => {
  it("keeps the pathname only and collapses identifiers", () => {
    expect(normalizePath("/produk/licorice-moisturizer?q=a#x")).toBe("/produk/licorice-moisturizer");
    expect(normalizePath("/account/orders/CNS-260930-00001")).toBe("/account/orders/:id");
    expect(normalizePath(`/admin-x/${ID}`)).toBe("/admin-x/:id");
    expect(normalizePath("/Produk/Serum%20Glow")).toBe("/produk/serumglow");
    expect(normalizePath("/")).toBe("/");
  });

  it("drops staff, API and invalid paths", () => {
    expect(normalizePath("/admin/orders")).toBeNull();
    expect(normalizePath("/api/analytics")).toBeNull();
    expect(normalizePath("")).toBeNull();
    expect(normalizePath(undefined)).toBeNull();
  });
});

describe("helpers", () => {
  it("keeps only external referrer hosts", () => {
    expect(referrerHost("https://www.instagram.com/p/abc?igsh=1", "cnsbeauty.id")).toBe("instagram.com");
    expect(referrerHost("https://cnsbeauty.id/produk", "www.cnsbeauty.id")).toBeNull();
    expect(referrerHost("not a url", "cnsbeauty.id")).toBeNull();
  });

  it("honours Do Not Track and Global Privacy Control", () => {
    expect(isOptedOut(new Headers({ dnt: "1" }))).toBe(true);
    expect(isOptedOut(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(isOptedOut(new Headers({ dnt: "0" }))).toBe(false);
  });

  it("compacts server properties", () => {
    expect(compactProperties({ a: 1, b: undefined, c: "x".repeat(200), d: null })).toEqual({ a: 1, c: "x".repeat(120), d: null });
  });

  it("parses the report window", () => {
    expect(parseReportWindow("7")).toBe(7);
    expect(parseReportWindow(["90"])).toBe(90);
    for (const bad of [undefined, "0", "365", "abc"]) expect(parseReportWindow(bad)).toBe(30);
  });

  it("builds funnel rates", () => {
    const steps = buildFunnel(["PAGE_VIEWED", "PRODUCT_VIEWED", "ADD_TO_CART"], [
      { event_name: "PAGE_VIEWED", visitors: 200 },
      { event_name: "PRODUCT_VIEWED", visitors: 50 },
    ]);
    expect(steps).toEqual([
      { event: "PAGE_VIEWED", visitors: 200, fromPrevious: null, fromStart: null },
      { event: "PRODUCT_VIEWED", visitors: 50, fromPrevious: 0.25, fromStart: 0.25 },
      { event: "ADD_TO_CART", visitors: 0, fromPrevious: 0, fromStart: 0 },
    ]);
    expect(buildFunnel(["AI_OPENED", "AI_MESSAGE_SENT"], [])[1]).toMatchObject({ fromPrevious: null, fromStart: null });
  });

  it("ranks values", () => {
    expect(topValues(["Serum", "serum ", "toner", null, "", "serum"], 2)).toEqual([
      { value: "serum", count: 3 },
      { value: "toner", count: 1 },
    ]);
  });
});

describe("assignAnonymousId", () => {
  const page = (headers: Record<string, string> = {}, cookie?: string) =>
    new NextRequest("https://cns.test/produk", { headers: { "sec-fetch-dest": "document", ...(cookie ? { cookie } : {}), ...headers } });

  it("assigns a random id on the first page request only", () => {
    const request = page();
    const id = assignAnonymousId(request);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.cookies.get("cns_aid")?.value).toBe(id);
    expect(assignAnonymousId(page({}, `cns_aid=${ID}`))).toBeNull();
  });

  it("skips opted-out visitors, non-page requests and replaces malformed ids", () => {
    expect(assignAnonymousId(page({ dnt: "1" }))).toBeNull();
    expect(assignAnonymousId(page({ "sec-gpc": "1" }))).toBeNull();
    expect(assignAnonymousId(new NextRequest("https://cns.test/api/cart", { headers: { "sec-fetch-dest": "empty" } }))).toBeNull();
    expect(assignAnonymousId(page({}, "cns_aid=not-a-uuid"))).toMatch(/^[0-9a-f-]{36}$/);
  });
});
