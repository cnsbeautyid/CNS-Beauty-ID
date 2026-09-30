import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { requireUser, getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Staff authorization for the admin area. Roles come from public.user_roles,
// read as the signed-in user (own_select_user_roles); the browser never
// supplies a role. Mirrors private.has_any_role(): an owner has every staff
// permission. Row-level access is still enforced by the staff_* RLS policies.

export type StaffRole = "admin" | "owner";
export type Staff = { id: string; email: string | null; roles: StaffRole[]; isOwner: boolean };

/** The signed-in staff member, null for customers/guests, undefined when roles can't be read. */
export const getStaff = cache(async (): Promise<Staff | null | undefined> => {
  const user = await getSessionUser();
  if (!user) return null;
  const db = await createClient();
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", user.id);
  if (error) {
    console.error("[admin] reading roles failed", error);
    return undefined;
  }
  const roles = (data ?? []).map((row) => row.role).filter((role): role is StaffRole => role === "admin" || role === "owner");
  if (roles.length === 0) return null;
  return { id: user.id, email: user.email, roles, isOwner: roles.includes("owner") };
});

/**
 * Admin pages: guests go to sign-in; signed-in non-staff get a 404 so the
 * admin area isn't advertised. A role read failure throws to the error boundary.
 */
export async function requireStaff(nextPath: string): Promise<Staff> {
  await requireUser(nextPath);
  const staff = await getStaff();
  if (staff === undefined) throw new Error("Staff roles could not be verified.");
  if (!staff) notFound();
  return staff;
}

/** Admin server actions: the verified staff member, or null (the action must refuse). */
export async function authorizeStaff(): Promise<Staff | null> {
  return (await getStaff()) ?? null;
}
