// Browser-safe env parsing with no dependencies: this module ships to every
// page, so it must not pull in Zod. Rules mirror the former Zod schema exactly
// (tests/unit/env.test.ts is the contract).

export type ClientEnv = {
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * A browser-exposed key must never carry elevated privileges. Rejects the new
 * `sb_secret_` keys and legacy JWT keys whose role is `service_role`.
 */
export function isPrivilegedSupabaseKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;

  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    // atob works in both the browser and Node; this module ships to both.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded: unknown = JSON.parse(atob(base64));
    return typeof decoded === "object" && decoded !== null && "role" in decoded && decoded.role === "service_role";
  } catch {
    return false;
  }
}

const blankToUndefined = (value: string | undefined) => (value === undefined || value.trim() === "" ? undefined : value);

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const issues: string[] = [];
  // URLs are trimmed like z.url() did (a pasted env value often ends in a newline);
  // the key is not, matching the former optional string rule.
  const siteUrl = blankToUndefined(source.NEXT_PUBLIC_SITE_URL)?.trim() ?? DEFAULT_SITE_URL;
  const supabaseUrl = blankToUndefined(source.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = blankToUndefined(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!isUrl(siteUrl)) issues.push("NEXT_PUBLIC_SITE_URL: Invalid URL");
  if (supabaseUrl !== undefined && !isUrl(supabaseUrl)) issues.push("NEXT_PUBLIC_SUPABASE_URL: Invalid URL");
  if (key !== undefined && isPrivilegedSupabaseKey(key)) {
    issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret/service-role key. Use the publishable key.");
  }
  if (issues.length > 0) throw new Error(`Invalid public environment: ${issues.join("; ")}`);

  return {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    ...(supabaseUrl !== undefined && { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl }),
    ...(key !== undefined && { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }),
  };
}
