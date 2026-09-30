import "server-only";

import { createClient } from "@/lib/supabase/server";

// Read-only summaries for the AI, content, analytics and audit modules (staff RLS).

type Db = Awaited<ReturnType<typeof createClient>>;
const count = { count: "exact" as const, head: true };

async function statusCounts(db: Db, table: "journal_articles" | "content_blocks" | "customer_stories" | "campaigns") {
  const { data, error } = await db.from(table).select("status");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}

export type AIInsights = {
  conversations30d: number;
  escalations30d: number;
  safetyFlagged30d: number;
  recommendations30d: number;
  aiOrders30d: number;
  recentEscalations: { id: string; reason: string; startedAt: string; signedIn: boolean }[];
};

export async function getAIInsights(): Promise<AIInsights | null> {
  const db = await createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [conversations, escalations, flagged, recommendations, aiOrders, recent] = await Promise.all([
    db.from("ai_conversations").select("id", count).gte("started_at", since),
    db.from("ai_conversations").select("id", count).gte("started_at", since).not("escalation_reason", "is", null),
    db.from("ai_conversations").select("id", count).gte("started_at", since).eq("safety_flagged", true),
    db.from("ai_recommendations").select("id", count).gte("created_at", since),
    db.from("orders").select("id", count).gte("created_at", since).not("ai_conversation_id", "is", null),
    db
      .from("ai_conversations")
      .select("id, escalation_reason, started_at, user_id")
      .not("escalation_reason", "is", null)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);
  const failed = [conversations, escalations, flagged, recommendations, aiOrders, recent].find((r) => r.error);
  if (failed) {
    console.error("[admin] getAIInsights failed", failed.error);
    return null;
  }
  return {
    conversations30d: conversations.count ?? 0,
    escalations30d: escalations.count ?? 0,
    safetyFlagged30d: flagged.count ?? 0,
    recommendations30d: recommendations.count ?? 0,
    aiOrders30d: aiOrders.count ?? 0,
    recentEscalations: (recent.data ?? []).map((row) => ({
      id: row.id,
      reason: row.escalation_reason ?? "",
      startedAt: row.started_at,
      signedIn: row.user_id !== null,
    })),
  };
}

export type ContentInsights = Record<"articles" | "blocks" | "stories" | "campaigns", Record<string, number>>;

export async function getContentInsights(): Promise<ContentInsights | null> {
  const db = await createClient();
  try {
    const [articles, blocks, stories, campaigns] = await Promise.all([
      statusCounts(db, "journal_articles"),
      statusCounts(db, "content_blocks"),
      statusCounts(db, "customer_stories"),
      statusCounts(db, "campaigns"),
    ]);
    return { articles, blocks, stories, campaigns };
  } catch (error) {
    console.error("[admin] getContentInsights failed", error);
    return null;
  }
}

export type AuditRow = { id: string; action: string; entityType: string; entityId: string | null; summary: unknown; createdAt: string; actor: string };

export async function listAuditLog(limit = 100): Promise<AuditRow[] | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("admin_audit_log")
    .select("id, actor_id, action, entity_type, entity_id, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin] listAuditLog failed", error);
    return null;
  }
  const actorIds = [...new Set((data ?? []).map((row) => row.actor_id))];
  const { data: people } = actorIds.length > 0 ? await db.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
  const names = new Map((people ?? []).map((row) => [row.id, row.full_name ?? row.email ?? "Staff"]));
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    createdAt: row.created_at,
    actor: names.get(row.actor_id) ?? "Staff",
  }));
}
