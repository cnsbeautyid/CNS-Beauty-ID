import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicConfig } from "@/lib/env/client";
import { getServerEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

/**
 * Service-role client. BYPASSES RLS. Only for trusted server-side business
 * services (checkout, payments, loyalty ledger, webhooks) after the caller has
 * been authorized. Never pass request input straight through to it.
 */
export function createAdminClient() {
  const { url } = requireSupabasePublicConfig();
  const serviceRoleKey = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
