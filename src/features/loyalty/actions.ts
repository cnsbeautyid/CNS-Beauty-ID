"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { redeemReward } from "@/services/loyalty/loyalty";

export type RedeemResult =
  | { ok: true; message: string; couponCode: string | null }
  | { ok: false; code: "unauthenticated" | "rejected" | "error"; message: string };

const REASONS: Record<string, string> = {
  reward_unavailable: "Hadiah ini sudah tidak tersedia.",
  reward_out_of_stock: "Stok hadiah ini sudah habis.",
};

/** Redeems a reward for the session user; the ledger function checks the balance atomically. */
export async function redeemRewardAction(rewardId: string): Promise<RedeemResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, code: "unauthenticated", message: "Masuk untuk menukar poin." };
  if (!z.uuid().safeParse(rewardId).success) return { ok: false, code: "error", message: "Hadiah tidak ditemukan." };

  const outcome = await redeemReward(user.id, rewardId);
  switch (outcome.status) {
    case "ok":
      revalidatePath(ROUTES.account.loyalty);
      return {
        ok: true,
        couponCode: outcome.couponCode,
        message: outcome.couponCode ? `Berhasil! Kode voucher kamu: ${outcome.couponCode}` : "Berhasil! Tim kami akan menghubungimu untuk hadiah ini.",
      };
    case "rejected":
      if (outcome.reason === "points_insufficient") {
        return { ok: false, code: "rejected", message: `Poin belum cukup (saldo ${(outcome.balance ?? 0).toLocaleString("id-ID")} poin).` };
      }
      return { ok: false, code: "rejected", message: REASONS[outcome.reason] ?? "Hadiah belum dapat ditukar." };
    case "unavailable":
      return { ok: false, code: "error", message: "Penukaran poin belum tersedia saat ini." };
    default:
      return { ok: false, code: "error", message: "Penukaran belum dapat diproses. Silakan coba lagi." };
  }
}
