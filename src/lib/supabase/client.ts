import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicConfig } from "@/lib/env/client";

/** Supabase client for Client Components. Uses the publishable key only. */
export function createClient() {
  const { url, publishableKey } = requireSupabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
