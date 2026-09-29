import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicConfig } from "@/lib/env/client";
import type { Database } from "@/types/database";

/** Supabase client for Client Components. Uses the publishable key only. */
export function createClient() {
  const { url, publishableKey } = requireSupabasePublicConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
