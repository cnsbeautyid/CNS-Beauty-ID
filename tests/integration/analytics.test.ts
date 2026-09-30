import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// /api/analytics and the server recorder, with Supabase and Next request
// APIs mocked. Identity comes from the session and the first-party cookie
// only; opted-out visitors are never stored.

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  pending: [] as Promise<unknown>[],
  userId: null as string | null,
  inserted: [] as unknown[],
  insertError: null as { code: string; message: string } | null,
  conversation: null as { user_id: string | null; anonymous_id: string | null } | null,
  adminAvailable: true,
  requestHeaders: new Headers(),
  cookies: new Map<string, string>(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    mocks.pending.push(Promise.resolve().then(task));
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
  cookies: async () => ({ get: (name: string) => (mocks.cookies.has(name) ? { value: mocks.cookies.get(name) } : undefined) }),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUserId: async () => mocks.userId }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (!mocks.adminAvailable) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    return {
      from: (table: string) =>
        table === "analytics_events"
          ? {
              insert: async (rows: unknown[]) => {
                mocks.inserted.push(...rows);
                return { error: mocks.insertError };
              },
            }
          : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.conversation }) }) }) },
    };
  },
}));

const { POST } = await import("@/app/api/analytics/route");
const { trackServerEvent } = await import("@/services/analytics/record");

const ORIGIN = "https://cns.test";
const AID = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const CONVERSATION = "44444444-4444-4444-8444-444444444444";
let ip = 0;

function post(body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new NextRequest(`${ORIGIN}/api/analytics`, {
    method: "POST",
    body: text,
    headers: { origin: ORIGIN, "content-type": "application/json", "content-length": String(text.length), "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
  });
}

async function settle() {
  await Promise.all(mocks.pending.splice(0));
}

beforeEach(() => {
  mocks.pending.length = 0;
  mocks.inserted.length = 0;
  mocks.userId = null;
  mocks.insertError = null;
  mocks.conversation = null;
  mocks.adminAvailable = true;
  mocks.requestHeaders = new Headers();
  mocks.cookies = new Map();
});

describe("POST /api/analytics", () => {
  it("stores a validated, PII-minimised event for the cookie visitor", async () => {
    mocks.userId = USER;
    const response = await POST(
      post(
        {
          name: "PAGE_VIEWED",
          properties: { pageType: "shop", email: "sari@example.com" },
          path: "/account/orders/CNS-260930-00001?token=x",
          referrer: "https://www.instagram.com/p/abc",
          sessionId: AID,
          utm: { source: "instagram" },
        },
        { cookie: `cns_aid=${AID}` },
      ),
    );
    await settle();
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.inserted).toEqual([
      expect.objectContaining({
        event_name: "PAGE_VIEWED",
        event_version: 1,
        user_id: USER,
        anonymous_id: AID,
        session_id: AID,
        properties: { pageType: "shop" },
        path: "/account/orders/:id",
        referrer: "instagram.com",
        utm_source: "instagram",
      }),
    ]);
  });

  it("gives a new visitor the first-party id", async () => {
    const response = await POST(post({ name: "LOYALTY_VIEWED" }));
    await settle();
    const cookie = response.headers.get("set-cookie") ?? "";
    const id = /cns_aid=([0-9a-f-]{36})/.exec(cookie)?.[1];
    expect(id).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(mocks.inserted).toEqual([expect.objectContaining({ anonymous_id: id, user_id: null })]);
  });

  it("stores nothing under Do Not Track or GPC", async () => {
    for (const header of [{ dnt: "1" }, { "sec-gpc": "1" }] as Record<string, string>[]) {
      const response = await POST(post({ name: "PAGE_VIEWED" }, header));
      expect(response.status).toBe(204);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    await settle();
    expect(mocks.inserted).toEqual([]);
  });

  it("rejects cross-site, oversized, malformed and server-only events", async () => {
    expect((await POST(post({ name: "PAGE_VIEWED" }, { origin: "https://evil.test" }))).status).toBe(403);
    expect((await POST(post({ name: "PAGE_VIEWED" }, { "content-length": "9000" }))).status).toBe(413);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect((await POST(post({ name: "ORDER_CREATED" }))).status).toBe(400);
    expect((await POST(post({ name: "ADD_TO_CART", productId: AID }))).status).toBe(400);
    await settle();
    expect(mocks.inserted).toEqual([]);
  });

  it("keeps an AI conversation link only for the visitor's own conversation", async () => {
    mocks.conversation = { user_id: null, anonymous_id: AID };
    await POST(post({ name: "AI_RECOMMENDATION_VIEWED", aiConversationId: CONVERSATION }, { cookie: `cns_aid=${AID}` }));
    mocks.conversation = { user_id: null, anonymous_id: "55555555-5555-4555-8555-555555555555" };
    await POST(post({ name: "AI_RECOMMENDATION_VIEWED", aiConversationId: CONVERSATION }, { cookie: `cns_aid=${AID}` }));
    await settle();
    expect(mocks.inserted.map((row) => (row as { ai_conversation_id: string | null }).ai_conversation_id)).toEqual([CONVERSATION, null]);
  });

  it("rate-limits per visitor, not per shared IP", async () => {
    const VISITOR = "66666666-6666-4666-8666-666666666666";
    const statuses: number[] = [];
    for (let i = 0; i < 61; i += 1) {
      statuses.push((await POST(post({ name: "PAGE_VIEWED" }, { cookie: `cns_aid=${VISITOR}`, "x-forwarded-for": "10.9.9.9" }))).status);
    }
    // Another visitor behind the same carrier IP is unaffected.
    const neighbour = await POST(post({ name: "PAGE_VIEWED" }, { cookie: `cns_aid=${AID}`, "x-forwarded-for": "10.9.9.9" }));
    await settle();
    expect(statuses.slice(0, 60).every((status) => status === 204)).toBe(true);
    expect(statuses[60]).toBe(429);
    expect(neighbour.status).toBe(204);
  });

  it("rate-limits cookieless requests per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 121; i += 1) statuses.push((await POST(post({ name: "PAGE_VIEWED" }, { "x-forwarded-for": "10.8.8.8" }))).status);
    await settle();
    expect(statuses.filter((status) => status === 429)).toHaveLength(1);
  });

  it("still answers 204 when storage is unavailable", async () => {
    mocks.adminAvailable = false;
    const response = await POST(post({ name: "PAGE_VIEWED" }));
    await settle();
    expect(response.status).toBe(204);
  });
});

describe("trackServerEvent", () => {
  it("records the requesting visitor", async () => {
    mocks.userId = USER;
    mocks.cookies.set("cns_aid", AID);
    await trackServerEvent("ADD_TO_CART", { productId: CONVERSATION, properties: { quantity: 2, source: "product", note: undefined } });
    await settle();
    expect(mocks.inserted).toEqual([
      expect.objectContaining({ event_name: "ADD_TO_CART", event_version: 1, user_id: USER, anonymous_id: AID, product_id: CONVERSATION, properties: { quantity: 2, source: "product" } }),
    ]);
  });

  it("drops identity under GPC and uses the subject for staff actions", async () => {
    mocks.userId = USER;
    mocks.cookies.set("cns_aid", AID);
    mocks.requestHeaders = new Headers({ "sec-gpc": "1" });
    await trackServerEvent("ORDER_CREATED", { orderId: CONVERSATION });
    mocks.requestHeaders = new Headers();
    await trackServerEvent("ORDER_DELIVERED", { orderId: CONVERSATION, subject: { userId: "customer-1" } });
    await settle();
    expect(mocks.inserted).toEqual([
      expect.objectContaining({ event_name: "ORDER_CREATED", user_id: null, anonymous_id: null }),
      expect.objectContaining({ event_name: "ORDER_DELIVERED", user_id: "customer-1", anonymous_id: null }),
    ]);
  });

  it("never throws when the insert fails", async () => {
    mocks.insertError = { code: "23514", message: "check violation" };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(trackServerEvent("VOUCHER_APPLIED")).resolves.toBeUndefined();
    await settle();
    expect(error).toHaveBeenCalledWith("[analytics] insert failed", expect.objectContaining({ events: ["VOUCHER_APPLIED"] }));
    error.mockRestore();
  });
});
