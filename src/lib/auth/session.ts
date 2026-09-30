import "server-only";

import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getSupabasePublicConfig } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";

/**
 * The verified user id from the session cookie (JWT signature checked by
 * getClaims), or null for guests. The only trustworthy source of identity:
 * never accept a user id from the browser.
 */
export async function getSessionUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}

export type SessionUser = { id: string; email: string | null };

/** The verified signed-in user (id + email from the JWT claims), or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!getSupabasePublicConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data || typeof data.claims.sub !== "string") return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
}

/** Server Components: the signed-in user, or a redirect to sign-in that returns to `nextPath`. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`${ROUTES.signIn}?next=${encodeURIComponent(nextPath)}`);
  return user;
}
