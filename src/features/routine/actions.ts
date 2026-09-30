"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { quizAnswersSchema, type QuizAnswers } from "@/services/quiz/schema";
import { computeQuizResult, getQuizOptions, logRecommendation } from "@/services/quiz/quiz";
import { addRoutineItem, getBuilderOptions, removeRoutineItem, saveRoutineFromPlan } from "@/services/routine/routine";

export type RoutineActionResult = { ok: true; message: string } | { ok: false; code: "unauthenticated" | "error"; message: string };

const SIGNED_OUT: RoutineActionResult = { ok: false, code: "unauthenticated", message: "Masuk untuk menyimpan rutinitas." };
const FAILED: RoutineActionResult = { ok: false, code: "error", message: "Rutinitas belum dapat disimpan. Silakan coba lagi." };

/**
 * Saves the quiz routine as the customer's routine. The plan is recomputed
 * from the answers on the server; a plan sent by the browser is never trusted.
 */
export async function saveQuizRoutineAction(values: QuizAnswers): Promise<RoutineActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const parsed = quizAnswersSchema.safeParse(values);
  const options = await getQuizOptions();
  if (!parsed.success || !options) return FAILED;

  const outcome = await computeQuizResult(parsed.data, options);
  if (outcome.status !== "ok") return FAILED;
  const recommendationId = await logRecommendation(user.id, parsed.data, outcome.result);
  const saved = await saveRoutineFromPlan(
    user.id,
    {
      am: outcome.result.routine.am.map((entry) => ({ step: entry.step, product: entry.product ? { id: entry.product.id } : null })),
      pm: outcome.result.routine.pm.map((entry) => ({ step: entry.step, product: entry.product ? { id: entry.product.id } : null })),
    },
    recommendationId,
  );
  if (!saved) return FAILED;
  revalidatePath(ROUTES.account.routine);
  return { ok: true, message: "Rutinitas tersimpan di akunmu." };
}

const addSchema = z.object({
  stepSlug: z.string().regex(/^[a-z0-9-]{1,64}$/),
  productId: z.uuid().nullable(),
  time: z.enum(["am", "pm", "both"]),
  note: z.string().trim().max(200).optional().transform((value) => value || undefined),
});

export async function addRoutineItemAction(values: z.input<typeof addSchema>): Promise<RoutineActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  const parsed = addSchema.safeParse(values);
  if (!parsed.success) return { ok: false, code: "error", message: "Periksa kembali pilihan langkah dan produk." };

  const options = await getBuilderOptions();
  const step = options?.steps.find((candidate) => candidate.slug === parsed.data.stepSlug);
  if (!options || !step) return { ok: false, code: "error", message: "Langkah rutinitas tidak dikenal." };
  if (step.time === "am" && parsed.data.time !== "am") return { ok: false, code: "error", message: `${step.name} hanya untuk pagi hari.` };
  if (parsed.data.productId && !options.products.some((product) => product.id === parsed.data.productId)) {
    return { ok: false, code: "error", message: "Produk ini sudah tidak tersedia." };
  }

  const result = await addRoutineItem(user.id, {
    stepId: step.id,
    stepOrder: step.order,
    productId: parsed.data.productId,
    time: parsed.data.time,
    note: parsed.data.note,
  });
  if (result === "duplicate") return { ok: false, code: "error", message: "Langkah ini sudah ada di rutinitasmu." };
  if (result === "error") return FAILED;
  revalidatePath(ROUTES.account.routine);
  return { ok: true, message: "Langkah ditambahkan." };
}

export async function removeRoutineItemAction(itemId: string): Promise<RoutineActionResult> {
  const user = await getSessionUser();
  if (!user) return SIGNED_OUT;
  if (!z.uuid().safeParse(itemId).success) return FAILED;
  // RLS: only the customer's own items can be deleted.
  if (!(await removeRoutineItem(itemId))) return { ok: false, code: "error", message: "Langkah belum dapat dihapus. Silakan coba lagi." };
  revalidatePath(ROUTES.account.routine);
  return { ok: true, message: "Langkah dihapus." };
}
