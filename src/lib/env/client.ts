import { parseClientEnv } from "./schema";

// Next.js only inlines NEXT_PUBLIC_* values that are referenced literally,
// so each variable is listed explicitly rather than passing process.env.
export const clientEnv = parseClientEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export type SupabasePublicConfig = { url: string; publishableKey: string };

/** Returns null until a Supabase project is configured. */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return config;
}
