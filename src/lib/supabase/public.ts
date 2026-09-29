import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/env/client";
import type { Database } from "@/types/database";

/**
 * Anonymous, cookie-less client for public catalog/content reads. RLS
 * limits it to published data. Unlike the cookie-based server client it does
 * not opt pages out of static rendering. Returns null until Supabase is
 * configured.
 */
export function createPublicClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
