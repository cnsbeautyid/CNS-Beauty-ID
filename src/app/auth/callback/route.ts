import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";
import { getSupabasePublicConfig } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/services/auth/schemas";

/** Email-confirmation landing: exchanges the PKCE code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), ROUTES.home);

  if (code && getSupabasePublicConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("[auth] exchangeCodeForSession failed", error.code);
  }

  const failed = new URL(ROUTES.signIn, origin);
  failed.searchParams.set("error", "link");
  failed.searchParams.set("next", next);
  return NextResponse.redirect(failed);
}
