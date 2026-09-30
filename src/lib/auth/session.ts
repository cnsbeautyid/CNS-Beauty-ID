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

export type SessionState = { status: "signed-in"; user: SessionUser } | { status: "signed-out" } | { status: "unknown" };

/**
 * The session as the UI should describe it. "unknown" means the check itself
 * failed (e.g. the signing keys couldn't be fetched): don't tell a customer
 * who may well be signed in to sign in again.
 */
export async function getSessionState(): Promise<SessionState> {
  if (!getSupabasePublicConfig()) return { status: "signed-out" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) return { status: "unknown" };
  if (!data || typeof data.claims.sub !== "string") return { status: "signed-out" };
  return { status: "signed-in", user: { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null } };
}

/** The verified signed-in user (id + email from the JWT claims), or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSessionState();
  return session.status === "signed-in" ? session.user : null;
}

/** Server Components: the signed-in user, or a redirect to sign-in that returns to `nextPath`. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`${ROUTES.signIn}?next=${encodeURIComponent(nextPath)}`);
  return user;
}
