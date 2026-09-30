"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { clientEnv, getSupabasePublicConfig } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/services/auth/errors";
import { mergeGuestCart } from "@/services/cart/store";
import { safeNextPath, signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "@/services/auth/schemas";

export type AuthFormResult = { status: "error"; message: string } | { status: "check_email"; email: string };

const UNAVAILABLE: AuthFormResult = { status: "error", message: "Layanan akun belum tersedia. Silakan coba lagi nanti." };

export async function signInAction(values: SignInValues, next: string): Promise<AuthFormResult> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  if (!getSupabasePublicConfig()) return UNAVAILABLE;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error.code) };
  await mergeGuestCart(supabase, data.user.id);

  redirect(safeNextPath(next, ROUTES.home));
}

export async function signUpAction(values: SignUpValues, next: string): Promise<AuthFormResult> {
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  if (!getSupabasePublicConfig()) return UNAVAILABLE;

  const target = safeNextPath(next, ROUTES.home);
  const callback = new URL(ROUTES.authCallback, clientEnv.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", target);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // full_name is copied into profiles by the handle_new_user trigger.
    options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: callback.toString() },
  });
  // An already-registered email gets the same "check your email" answer, so
  // the form can't be used to discover who has an account.
  if (error && error.code !== "user_already_exists") return { status: "error", message: authErrorMessage(error.code) };
  if (data.session && data.user) {
    await mergeGuestCart(supabase, data.user.id);
    redirect(target);
  }

  return { status: "check_email", email: parsed.data.email };
}

export async function signOutAction(): Promise<void> {
  if (getSupabasePublicConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(ROUTES.home);
}
