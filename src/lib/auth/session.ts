import "server-only";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";

/**
 * The verified user id from the session cookie (JWT signature checked by
 * getClaims), or null for guests. The only trustworthy source of identity:
 * never accept a user id from the browser.
 */
export async function getSessionUserId(): Promise<string | null> {
  if (!getSupabasePublicConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return typeof data.claims.sub === "string" ? data.claims.sub : null;
}
