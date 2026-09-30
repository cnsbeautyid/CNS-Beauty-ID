import "server-only";

import { createClient } from "@/lib/supabase/server";

import { computeKpis, type Kpis } from "./model";

// Dashboard figures, read as the staff member (staff_select_* RLS). Rows are
// fetched for the window and aggregated in computeKpis(); fine at the current
// volume, to be replaced by a SQL aggregate once order volume grows (Phase 18).

export type Dashboard = {
  days: number;
  kpis: Kpis;
  customers: number;
  newCustomers: number;
  aiConversations: number;
  aiEscalations: number;
  queues: { pendingPayment: number; toShip: number; applications: number; knowledgeReview: number; claimReview: number; lowStock: number };
};

const ORDER_LIMIT = 5000;

export async function getDashboard(days = 30): Promise<Dashboard | null> {
  const db = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const count = { count: "exact" as const, head: true };

  const [orders, customers, newCustomers, conversations, escalations, toShip, applications, knowledge, benefits, faqs, copy, stock] = await Promise.all([
    db.from("orders").select("status, total, user_id, partner_type, ai_conversation_id").gte("created_at", since).limit(ORDER_LIMIT),
    db.from("profiles").select("id", count),
    db.from("profiles").select("id", count).gte("created_at", since),
    db.from("ai_conversations").select("id", count).gte("started_at", since),
    db.from("ai_conversations").select("id", count).gte("started_at", since).not("escalation_reason", "is", null),
    db.from("orders").select("id", count).in("status", ["paid", "processing"]),
    db.from("reseller_applications").select("id", count).eq("status", "pending"),
    db.from("knowledge_documents").select("id", count).eq("status", "pending_review"),
    db.from("product_benefits").select("id", count).neq("review_status", "approved"),
    db.from("product_faqs").select("id", count).neq("review_status", "approved"),
    db.from("products").select("id", count).neq("copy_status", "approved").neq("status", "archived"),
    db.from("products").select("stock, low_stock_threshold").eq("status", "active"),
  ]);
  const failed = [orders, customers, newCustomers, conversations, escalations, toShip, applications, knowledge, benefits, faqs, copy, stock].find((r) => r.error);
  if (failed) {
    console.error("[admin] dashboard failed", failed.error);
    return null;
  }

  const kpis = computeKpis(
    (orders.data ?? []).map((row) => ({
      status: row.status,
      total: row.total,
      userId: row.user_id,
      partnerType: row.partner_type,
      aiConversationId: row.ai_conversation_id,
    })),
  );
  return {
    days,
    kpis,
    customers: customers.count ?? 0,
    newCustomers: newCustomers.count ?? 0,
    aiConversations: conversations.count ?? 0,
    aiEscalations: escalations.count ?? 0,
    queues: {
      pendingPayment: kpis.pendingPayment,
      toShip: toShip.count ?? 0,
      applications: applications.count ?? 0,
      knowledgeReview: knowledge.count ?? 0,
      claimReview: (benefits.count ?? 0) + (faqs.count ?? 0) + (copy.count ?? 0),
      lowStock: (stock.data ?? []).filter((row) => row.stock <= row.low_stock_threshold).length,
    },
  };
}
