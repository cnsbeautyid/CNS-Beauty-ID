import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { toLexicalQuery, type KnowledgeCategory } from "./knowledge-query";

export type KnowledgeSource = { chunkId: string; title: string; category: string; content: string };
export type KnowledgeResult = { status: "ok"; sources: KnowledgeSource[] } | { status: "unavailable" } | { status: "error" };

const MAX_SOURCES = 4;
const MAX_CONTENT = 1200;

/**
 * Approved knowledge only: public.match_knowledge filters on
 * status = 'approved', and approval requires a person (Phase 10 guard).
 * EXECUTE is service_role only, so this runs server-side.
 */
export async function searchKnowledge(question: string, options: { category?: KnowledgeCategory } = {}): Promise<KnowledgeResult> {
  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return { status: "unavailable" };
  const query = toLexicalQuery(question);
  if (!query) return { status: "ok", sources: [] };

  try {
    const { data, error } = await createAdminClient().rpc("match_knowledge", {
      p_query: query,
      p_limit: MAX_SOURCES,
      p_categories: options.category ? [options.category] : undefined,
    });
    if (error) throw error;
    return {
      status: "ok",
      sources: (data ?? []).map((row) => ({
        chunkId: row.chunk_id,
        title: row.title,
        category: row.category,
        content: row.content.slice(0, MAX_CONTENT),
      })),
    };
  } catch (error) {
    console.error("[ai] searchKnowledge failed", error);
    return { status: "error" };
  }
}
