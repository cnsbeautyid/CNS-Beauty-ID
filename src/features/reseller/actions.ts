"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { applicationSchema, type ApplicationValues } from "@/services/reseller/model";
import { getOwnApplication, getOwnPartner, submitApplication } from "@/services/reseller/reseller";

export type ApplicationResult = { ok: true; message: string } | { ok: false; code: "unauthenticated" | "invalid" | "duplicate" | "error"; message: string };

/**
 * Submits a partner application for the session user. Status, reviewer and
 * approval are never taken from the browser: RLS only accepts a pending,
 * unreviewed row owned by the caller, and approval happens in the back office.
 */
export async function submitApplicationAction(values: ApplicationValues): Promise<ApplicationResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, code: "unauthenticated", message: "Masuk terlebih dahulu untuk mengajukan pendaftaran." };

  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Periksa kembali data pendaftaran." };

  const [partner, existing] = await Promise.all([getOwnPartner(), getOwnApplication()]);
  if (partner) return { ok: false, code: "duplicate", message: "Akunmu sudah terdaftar sebagai partner CNS Beauty." };
  if (existing?.status === "pending") return { ok: false, code: "duplicate", message: "Pendaftaranmu sedang ditinjau. Kami akan menghubungimu." };

  if (!(await submitApplication(user.id, parsed.data))) {
    return { ok: false, code: "error", message: "Pendaftaran belum dapat dikirim. Silakan coba lagi." };
  }
  revalidatePath(ROUTES.resellerProgram);
  return { ok: true, message: "Terima kasih! Pendaftaranmu sudah kami terima dan akan ditinjau oleh tim CNS Beauty." };
}
