"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { createPublicClient } from "@/lib/supabase/public";
import { trackServerEvent } from "@/services/analytics/record";
import { addItem, itemCount, type CartState } from "@/services/cart/model";
import { CartStoreError, readCart, writeCart } from "@/services/cart/store";
import { quizAnswersSchema, type QuizAnswers } from "@/services/quiz/schema";
import { computeQuizResult, getQuizOptions, logRecommendation, saveBeautyProfile, type QuizResult } from "@/services/quiz/quiz";

export type QuizActionResult =
  | { ok: true; result: QuizResult; saved: boolean }
  | { ok: false; message: string };

/**
 * Scores the quiz on the server (the browser only sends answers). Signed-in
 * customers get their beauty profile saved; every run is logged for audit.
 */
export async function submitSkinQuizAction(values: QuizAnswers): Promise<QuizActionResult> {
  const parsed = quizAnswersSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Jawaban belum lengkap." };
  const options = await getQuizOptions();
  if (!options) return { ok: false, message: "Skin Quiz belum dapat diproses saat ini. Silakan coba lagi." };
  if (!options.skinTypes.some((type) => type.slug === parsed.data.skinType) && parsed.data.skinType !== "unsure") {
    return { ok: false, message: "Jenis kulit tidak dikenali." };
  }

  const outcome = await computeQuizResult(parsed.data, options);
  if (outcome.status !== "ok") return { ok: false, message: "Rekomendasi belum dapat dibuat. Silakan coba lagi." };

  const user = await getSessionUser();
  const saved = user ? await saveBeautyProfile(user.id, parsed.data, options) : false;
  await logRecommendation(user?.id ?? null, parsed.data, outcome.result);
  await trackServerEvent("SKIN_QUIZ_COMPLETED", {
    properties: { skinType: parsed.data.skinType, concerns: parsed.data.concerns.length, recommended: outcome.result.products.length },
  });
  if (saved) revalidatePath(ROUTES.account.skinProfile);
  return { ok: true, result: outcome.result, saved };
}

export type SaveProfileResult = { ok: true } | { ok: false; code: "unauthenticated" | "error"; message: string };

export async function saveSkinProfileAction(values: QuizAnswers): Promise<SaveProfileResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, code: "unauthenticated", message: "Masuk untuk menyimpan profil kulit." };
  const parsed = quizAnswersSchema.safeParse(values);
  const options = await getQuizOptions();
  if (!parsed.success || !options) return { ok: false, code: "error", message: "Profil belum dapat disimpan. Silakan coba lagi." };
  const saved = await saveBeautyProfile(user.id, parsed.data, options);
  if (!saved) return { ok: false, code: "error", message: "Profil belum dapat disimpan. Silakan coba lagi." };
  revalidatePath(ROUTES.account.skinProfile);
  return { ok: true };
}

export type RoutineCartResult = { ok: true; added: number; skipped: number; count: number } | { ok: false; message: string };

/** "Add routine to cart": only active, in-stock products; the cart quote re-checks everything. */
export async function addRoutineToCartAction(productIds: string[]): Promise<RoutineCartResult> {
  const parsed = z.array(z.uuid()).min(1).max(6).safeParse(productIds);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  const catalog = createPublicClient();
  if (!catalog) return { ok: false, message: "Keranjang belum tersedia." };

  const { data, error } = await catalog.from("products").select("id, stock").eq("status", "active").in("id", parsed.data);
  if (error) return { ok: false, message: "Produk belum dapat ditambahkan. Silakan coba lagi." };
  const available = (data ?? []).filter((product) => product.stock > 0).map((product) => product.id);
  if (available.length === 0) return { ok: false, message: "Produk dalam rutinitas ini sedang tidak tersedia." };

  try {
    const cart = available.reduce<CartState>((current, id) => {
      const change = addItem(current, id, undefined, 1);
      return "cart" in change ? change.cart : current;
    }, await readCart());
    await writeCart(cart);
    revalidatePath(ROUTES.cart);
    await trackServerEvent("ADD_TO_CART", { properties: { quantity: available.length, source: "skin_quiz" } });
    return { ok: true, added: available.length, skipped: parsed.data.length - available.length, count: itemCount(cart) };
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    return { ok: false, message: "Keranjang belum dapat diperbarui. Silakan coba lagi." };
  }
}
