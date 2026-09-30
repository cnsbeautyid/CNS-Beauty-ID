import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { LLM_PROVIDER } from "./llm";

// Conversation logging (owner decision, Phase 9) in the existing
// ai_conversations / ai_messages tables. Written server-side with the service
// role; signed-in customers read their own rows through RLS. Logging never
// blocks or breaks a reply.

export const CONCIERGE_AGENT = "beauty_concierge";

type Owner = { userId: string | null; anonymousId: string };

function admin() {
  return getServerEnv().SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

/** Reuses the caller's own conversation, or starts a new one. Null if logging is unavailable. */
export async function resolveConversation(requestedId: string | undefined, owner: Owner, meta: { model: string; pageType?: string }) {
  const db = admin();
  if (!db) return null;
  try {
    if (requestedId) {
      const { data } = await db.from("ai_conversations").select("id, user_id, anonymous_id").eq("id", requestedId).maybeSingle();
      const owned = data && (owner.userId ? data.user_id === owner.userId : !data.user_id && data.anonymous_id === owner.anonymousId);
      if (owned) return data.id;
    }
    const { data, error } = await db
      .from("ai_conversations")
      .insert({
        user_id: owner.userId,
        anonymous_id: owner.userId ? null : owner.anonymousId,
        channel: "web",
        agent: CONCIERGE_AGENT,
        provider: LLM_PROVIDER,
        model: meta.model,
        intake: meta.pageType ? { page_type: meta.pageType } : {},
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error("[ai] resolveConversation failed", error);
    return null;
  }
}

export async function logMessage(
  conversationId: string | null,
  message: { role: "user" | "assistant"; content: string; inputTokens?: number; outputTokens?: number; latencyMs?: number },
) {
  const db = admin();
  if (!db || !conversationId || !message.content) return;
  const { error } = await db.from("ai_messages").insert({
    conversation_id: conversationId,
    role: message.role,
    agent: CONCIERGE_AGENT,
    content: message.content,
    input_tokens: message.inputTokens ?? null,
    output_tokens: message.outputTokens ?? null,
    latency_ms: message.latencyMs ?? null,
  });
  if (error) console.error("[ai] logMessage failed", error);
}

export async function markEscalated(conversationId: string | null, reason: string) {
  const db = admin();
  if (!db || !conversationId) return;
  const { error } = await db.from("ai_conversations").update({ status: "escalated", escalation_reason: reason.slice(0, 300) }).eq("id", conversationId);
  if (error) console.error("[ai] markEscalated failed", error);
}

/** Owner switch in settings.ai (not public). Defaults to enabled when unreadable. */
export async function isConciergeEnabled(): Promise<boolean> {
  const db = admin();
  if (!db) return true;
  const { data, error } = await db.from("settings").select("value").eq("key", "ai").maybeSingle();
  if (error || !data) return true;
  const value = data.value as { enabled?: unknown } | null;
  return value?.enabled !== false;
}
