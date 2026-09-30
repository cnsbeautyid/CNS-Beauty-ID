import { randomUUID } from "node:crypto";

import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ANALYTICS_EVENT_VERSION, ANONYMOUS_ID_COOKIE } from "@/constants/analytics";
import { setAnonymousIdCookie } from "@/lib/analytics/anonymous-id";
import { getSessionUserId } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { clientEventSchema, isOptedOut, normalizePath, referrerHost } from "@/services/analytics/model";
import { insertEvents } from "@/services/analytics/record";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;
// Per visitor when the first-party id is present (many mobile users share one
// carrier IP); per IP, more loosely, for cookieless requests.
const visitorLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const ipLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

const done = (status: number) => new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });

/** True for same-origin browser requests (sendBeacon/fetch from our pages). */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === request.nextUrl.origin;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

/** Keeps the AI conversation link only when the conversation belongs to this visitor. */
async function ownedConversation(id: string | undefined, userId: string | null, anonymousId: string): Promise<string | null> {
  if (!id) return null;
  try {
    const { data } = await createAdminClient().from("ai_conversations").select("user_id, anonymous_id").eq("id", id).maybeSingle();
    if (!data) return null;
    return (userId ? data.user_id === userId : data.user_id === null && data.anonymous_id === anonymousId) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Browser event ingestion (CLIENT_EVENTS only). Same-origin, size-capped,
 * rate-limited and validated per event; identity comes from the session and
 * the first-party cookie, never from the body. Do Not Track / GPC → nothing
 * is stored. Always answers 204 for accepted-or-dropped events so the page
 * never waits on analytics.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return done(403);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return done(413);
  if (isOptedOut(request.headers)) return done(204);

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done(400);
  }
  const parsed = clientEventSchema.safeParse(body);
  if (!parsed.success) return done(400);
  const event = parsed.data;

  const stored = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value;
  const known = Boolean(stored && z.uuid().safeParse(stored).success);
  const anonymousId = known && stored ? stored.toLowerCase() : randomUUID();
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const allowed = known ? visitorLimiter.hit(anonymousId) : ipLimiter.hit(clientIp || anonymousId);
  if (!allowed) return done(429);

  const userId = await getSessionUserId();
  after(async () => {
    const aiConversationId = await ownedConversation(event.aiConversationId, userId, anonymousId);
    await insertEvents([
      {
        event_name: event.name,
        event_version: ANALYTICS_EVENT_VERSION,
        user_id: userId,
        anonymous_id: anonymousId,
        session_id: event.sessionId ?? null,
        product_id: event.productId ?? null,
        ai_conversation_id: aiConversationId,
        properties: event.properties,
        path: normalizePath(event.path),
        referrer: referrerHost(event.referrer, request.nextUrl.hostname),
        utm_source: event.utm?.source ?? null,
        utm_medium: event.utm?.medium ?? null,
        utm_campaign: event.utm?.campaign ?? null,
      },
    ]);
  });

  const response = done(204);
  if (stored !== anonymousId) setAnonymousIdCookie(response, anonymousId);
  return response;
}
