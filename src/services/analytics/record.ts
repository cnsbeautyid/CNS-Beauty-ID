import "server-only";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { ANALYTICS_EVENT_VERSION, ANONYMOUS_ID_COOKIE, type AnalyticsEventName } from "@/constants/analytics";
import { getSessionUserId } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

import { compactProperties, isOptedOut, type ServerEventInput } from "./model";

// Writes analytics_events through the service role. Only the server writes
// events (anon/authenticated have no write privilege), after validation. A
// failed or disabled write never affects the customer's action.

type EventRow = Database["public"]["Tables"]["analytics_events"]["Insert"];
export type AnalyticsIdentity = { userId: string | null; anonymousId: string | null };

let warned = false;

function analyticsClient() {
  try {
    return createAdminClient();
  } catch {
    if (!warned) {
      warned = true;
      console.warn("[analytics] SUPABASE_SERVICE_ROLE_KEY is not configured; events are not recorded.");
    }
    return null;
  }
}

/** Inserts prepared rows. Never throws. */
export async function insertEvents(rows: EventRow[]): Promise<boolean> {
  if (rows.length === 0) return true;
  const db = analyticsClient();
  if (!db) return false;
  const { error } = await db.from("analytics_events").insert(rows);
  if (error) console.error("[analytics] insert failed", { events: rows.map((row) => row.event_name), code: error.code, message: error.message });
  return !error;
}

/**
 * The requesting visitor: first-party anonymous id and signed-in user.
 * Do Not Track / Global Privacy Control removes both.
 */
export async function getAnalyticsIdentity(userId?: string | null): Promise<AnalyticsIdentity> {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  if (isOptedOut(requestHeaders)) return { userId: null, anonymousId: null };
  const stored = cookieStore.get(ANONYMOUS_ID_COOKIE)?.value;
  return {
    userId: userId === undefined ? await getSessionUserId() : userId,
    anonymousId: stored && z.uuid().safeParse(stored).success ? stored.toLowerCase() : null,
  };
}

type TrackOptions = ServerEventInput & {
  /**
   * Whose event this is. Default: the requesting visitor. Staff actions on a
   * customer's order pass the customer's user id instead (never the staff's).
   */
  subject?: { userId: string | null };
};

/**
 * Records a server-side event after the response is sent, so it never
 * delays or fails the action that caused it.
 */
export async function trackServerEvent(name: AnalyticsEventName, options: TrackOptions = {}): Promise<void> {
  try {
    const identity: AnalyticsIdentity = options.subject ? { userId: options.subject.userId, anonymousId: null } : await getAnalyticsIdentity();
    const row: EventRow = {
      event_name: name,
      event_version: ANALYTICS_EVENT_VERSION,
      user_id: identity.userId,
      anonymous_id: identity.anonymousId,
      product_id: options.productId ?? null,
      order_id: options.orderId ?? null,
      ai_conversation_id: options.aiConversationId ?? null,
      properties: compactProperties(options.properties),
    };
    after(() => insertEvents([row]));
  } catch (error) {
    console.error("[analytics] tracking failed", { name, error });
  }
}
