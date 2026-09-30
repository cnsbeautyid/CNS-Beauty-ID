"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, profileSchema, toProfileUpdate, type AddressValues, type ProfileValues } from "@/services/account/schemas";

// All writes run as the signed-in user: RLS (own rows) and the column-level
// grants on profiles decide what may change, never the browser.

export type AccountActionResult = { ok: true; message: string } | { ok: false; message: string };

const SIGNED_OUT: AccountActionResult = { ok: false, message: "Sesi berakhir. Silakan masuk kembali." };
const FAILED: AccountActionResult = { ok: false, message: "Perubahan belum dapat disimpan. Silakan coba lagi." };

export async function updateProfileAction(values: ProfileValues): Promise<AccountActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Periksa kembali data profil." };

  const db = await createClient();
  const { error } = await db.from("profiles").update(toProfileUpdate(parsed.data)).eq("id", user.id);
  if (error) {
    console.error("[account] profile update failed", error);
    return FAILED;
  }
  revalidatePath(ROUTES.account.dashboard, "layout");
  return { ok: true, message: "Profil disimpan." };
}

export async function addAddressAction(values: AddressValues): Promise<AccountActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const parsed = addressSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Periksa kembali alamat." };

  const db = await createClient();
  const { count } = await db.from("addresses").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 10) return { ok: false, message: "Maksimal 10 alamat. Hapus salah satu alamat terlebih dahulu." };

  const address = parsed.data;
  const { error } = await db.from("addresses").insert({
    user_id: user.id,
    label: address.label ?? null,
    recipient_name: address.recipientName,
    phone: address.phone,
    address_line: address.addressLine,
    district: address.district,
    city: address.city,
    province: address.province,
    postal_code: address.postalCode,
    is_default: (count ?? 0) === 0,
  });
  if (error) {
    console.error("[account] address insert failed", error);
    return FAILED;
  }
  revalidatePath(ROUTES.account.settings);
  return { ok: true, message: "Alamat disimpan." };
}

const idSchema = z.uuid();

export async function deleteAddressAction(id: string): Promise<AccountActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  if (!idSchema.safeParse(id).success) return FAILED;

  const db = await createClient();
  const { error } = await db.from("addresses").delete().eq("id", id);
  if (error) {
    console.error("[account] address delete failed", error);
    return FAILED;
  }
  revalidatePath(ROUTES.account.settings);
  return { ok: true, message: "Alamat dihapus." };
}

export async function setDefaultAddressAction(id: string): Promise<AccountActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  if (!idSchema.safeParse(id).success) return FAILED;

  const db = await createClient();
  // RLS scopes both updates to the user's own addresses.
  const { data: target } = await db.from("addresses").select("id").eq("id", id).maybeSingle();
  if (!target) return FAILED;
  const cleared = await db.from("addresses").update({ is_default: false }).neq("id", id).eq("is_default", true);
  const set = await db.from("addresses").update({ is_default: true }).eq("id", id);
  if (cleared.error || set.error) {
    console.error("[account] set default address failed", cleared.error ?? set.error);
    return FAILED;
  }
  revalidatePath(ROUTES.account.settings);
  return { ok: true, message: "Alamat utama diperbarui." };
}
