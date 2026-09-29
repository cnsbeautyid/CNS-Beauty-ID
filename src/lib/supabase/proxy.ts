import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/env/client";

/**
 * Refreshes the Supabase auth session on each matched request. Route
 * protection (account/reseller/admin) is added in the phases that build those
 * areas, and is always re-checked server-side where data is read.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const config = getSupabasePublicConfig();
  if (!config) return response;

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Cache headers stop CDNs from serving one user's session to another.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  await supabase.auth.getClaims();

  return response;
}
