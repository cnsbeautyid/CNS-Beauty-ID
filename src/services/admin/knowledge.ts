import "server-only";

import { createClient } from "@/lib/supabase/server";

import { KNOWLEDGE_TARGET } from "./model";

// Knowledge review (Phase 10 governance). Approval must be done by a person:
// knowledge_review_guard stamps approved_by from auth.uid() and turns
// service-role approvals into pending_review, so this runs as the staff member.

export type AdminKnowledgeDoc = { id: string; title: string; body: string; category: string; status: string; updatedAt: string; approvedAt: string | null; chunks: number };

export async function listKnowledge(): Promise<AdminKnowledgeDoc[] | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("knowledge_documents")
    .select("id, title, body, category, status, updated_at, approved_at, knowledge_chunks(count)")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[admin] listKnowledge failed", error);
    return null;
  }
  const rank: Record<string, number> = { pending_review: 0, draft: 1, approved: 2, archived: 3 };
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      status: row.status,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      chunks: row.knowledge_chunks[0]?.count ?? 0,
    }))
    .sort((a, b) => (rank[a.status] ?? 4) - (rank[b.status] ?? 4));
}

/** Sets a document's status. Returns the title and previous status, or null on failure / not found. */
export async function decideKnowledge(id: string, decision: keyof typeof KNOWLEDGE_TARGET): Promise<{ title: string; from: string; to: string } | null> {
  const db = await createClient();
  const { data: before, error: readError } = await db.from("knowledge_documents").select("title, status").eq("id", id).maybeSingle();
  if (readError || !before) {
    if (readError) console.error("[admin] knowledge read failed", readError);
    return null;
  }
  const { data, error } = await db.from("knowledge_documents").update({ status: KNOWLEDGE_TARGET[decision] }).eq("id", id).select("status").maybeSingle();
  if (error || !data) {
    if (error) console.error("[admin] knowledge update failed", error);
    return null;
  }
  return { title: before.title, from: before.status, to: data.status };
}
