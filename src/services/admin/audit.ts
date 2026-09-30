import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type AuditEntry = {
  /** `entity.verb`, e.g. `order.mark_paid` (DB check: ^[a-z_]+\.[a-z_]+$). */
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: Record<string, Json | undefined>;
};

/**
 * Appends to admin_audit_log as the acting staff member (RLS:
 * staff_insert_admin_audit_log requires actor_id = auth.uid()). Returns false
 * on failure; callers log and still report their own outcome, because the
 * action has already happened.
 */
export async function recordAudit(entry: AuditEntry): Promise<boolean> {
  const db = await createClient();
  const { error } = await db.from("admin_audit_log").insert({
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    summary: (entry.summary ?? {}) as Json,
  });
  if (error) console.error("[admin] audit insert failed", { action: entry.action, error });
  return !error;
}
