import type { NextRequest, NextResponse } from "next/server";

import { ANONYMOUS_ID_COOKIE, ANONYMOUS_ID_MAX_AGE } from "@/constants/analytics";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gives a first-time visitor the first-party anonymous id on their first page
 * request, so every later event (browser or server) shares one id. Skipped
 * under Do Not Track / GPC and for non-page requests. Returns the new id, or
 * null when none was assigned. The id is also set on the request so the
 * same render already sees it.
 */
export function assignAnonymousId(request: NextRequest): string | null {
  if (request.method !== "GET" || request.headers.get("sec-fetch-dest") !== "document") return null;
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return null;
  const current = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value;
  if (current && UUID.test(current)) return null;
  const id = crypto.randomUUID();
  request.cookies.set(ANONYMOUS_ID_COOKIE, id);
  return id;
}

export function setAnonymousIdCookie(response: NextResponse, id: string) {
  response.cookies.set(ANONYMOUS_ID_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANONYMOUS_ID_MAX_AGE,
  });
}
