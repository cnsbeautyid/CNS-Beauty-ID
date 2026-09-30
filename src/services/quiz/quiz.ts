import "server-only";

import { cache } from "react";

import { clientEnv } from "@/lib/env/client";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_CARD_COLUMNS, toProductCard, type ProductCardRow } from "@/services/catalog/mapper";

import { budgetMax, SENSITIVITY_OPTIONS, UNSURE_SKIN_TYPE, type QuizAnswers } from "./schema";
import {
  buildRoutine,
  DEFAULT_WEIGHTS,
  rankProducts,
  safetyNotes,
  SCORING_VERSION,
  type QuizProduct,
  type RankedProduct,
  type RecommendationWeights,
  type RoutinePlan,
  type RoutineStep,
} from "./scoring";

type Named = { id: string; slug: string; name: string };
export type QuizOptions = { skinTypes: Named[]; concerns: Named[]; steps: RoutineStep[] };

export const MAX_RECOMMENDATIONS = 4;

/** Catalog vocabulary for the quiz. Null when the catalog can't be read. */
export const getQuizOptions = cache(async (): Promise<QuizOptions | null> => {
  const db = createPublicClient();
  if (!db) return null;
  const [skinTypes, concerns, steps] = await Promise.all([
    db.from("skin_types").select("id, slug, name").order("sort_order"),
    db.from("concerns").select("id, slug, name").eq("is_visible", true).order("sort_order"),
    db.from("routine_steps").select("slug, name, step_order, time_of_day").order("step_order"),
  ]);
  const failed = skinTypes.error ?? concerns.error ?? steps.error;
  if (failed) {
    console.error("[quiz] getQuizOptions failed", failed);
    return null;
  }
  return {
    skinTypes: skinTypes.data ?? [],
    concerns: concerns.data ?? [],
    steps: (steps.data ?? []).map((step) => ({ slug: step.slug, name: step.name, order: step.step_order, time: step.time_of_day })),
  };
});

const QUIZ_PRODUCT_COLUMNS =
  `id, popularity_score, routine_steps!products_routine_step_id_fkey(slug, name, step_order, time_of_day), product_concerns(relevance, concerns(slug)), product_skin_types(skin_types(slug)), ${PRODUCT_CARD_COLUMNS}` as const;

async function loadQuizProducts(): Promise<QuizProduct[] | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db.from("products").select(QUIZ_PRODUCT_COLUMNS).eq("status", "active");
  if (error) {
    console.error("[quiz] loadQuizProducts failed", error);
    return null;
  }
  return data.map((row) => ({
    id: row.id,
    card: toProductCard(row as unknown as ProductCardRow, clientEnv.NEXT_PUBLIC_SUPABASE_URL),
    popularity: row.popularity_score ?? 0,
    concerns: Object.fromEntries(row.product_concerns.flatMap((link) => (link.concerns ? [[link.concerns.slug, link.relevance]] : []))),
    skinTypes: row.product_skin_types.flatMap((link) => (link.skin_types ? [link.skin_types.slug] : [])),
    step: row.routine_steps
      ? { slug: row.routine_steps.slug, name: row.routine_steps.name, order: row.routine_steps.step_order, time: row.routine_steps.time_of_day }
      : null,
  }));
}

/** Owner-tuned weights (staff-only table), or the documented defaults. */
async function getWeights(): Promise<RecommendationWeights> {
  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return DEFAULT_WEIGHTS;
  const { data, error } = await createAdminClient().from("recommendation_weights").select("*").eq("id", "default").maybeSingle();
  if (error || !data) return DEFAULT_WEIGHTS;
  return {
    skinTypeMatch: Number(data.skin_type_match),
    concernMatch: Number(data.concern_match),
    routineMatch: Number(data.routine_match),
    preferenceMatch: Number(data.preference_match),
    budgetMatch: Number(data.budget_match),
    popularity: Number(data.popularity),
  };
}

export type QuizResult = {
  profile: { skinType: string | null; concerns: string[]; sensitivity: string; budget: number | null };
  products: RankedProduct[];
  routine: RoutinePlan;
  notes: string[];
};

export type QuizOutcome = { status: "ok"; result: QuizResult } | { status: "error" };

export async function computeQuizResult(answers: QuizAnswers, options: QuizOptions): Promise<QuizOutcome> {
  const products = await loadQuizProducts();
  if (!products) return { status: "error" };
  const concernNames = Object.fromEntries(options.concerns.map((concern) => [concern.slug, concern.name]));
  const ranked = rankProducts(products, answers, await getWeights(), concernNames).slice(0, MAX_RECOMMENDATIONS);
  return {
    status: "ok",
    result: {
      profile: {
        skinType: answers.skinType === UNSURE_SKIN_TYPE ? null : (options.skinTypes.find((type) => type.slug === answers.skinType)?.name ?? null),
        concerns: answers.concerns.map((slug) => concernNames[slug] ?? slug),
        sensitivity: SENSITIVITY_OPTIONS.find((option) => option.value === answers.sensitivity)?.label ?? answers.sensitivity,
        budget: budgetMax(answers.budget),
      },
      products: ranked,
      routine: buildRoutine(ranked, options.steps, answers.routine),
      notes: safetyNotes(answers),
    },
  };
}

/** Upserts the signed-in user's beauty profile (RLS: own row; unique per user). */
export async function saveBeautyProfile(userId: string, answers: QuizAnswers, options: QuizOptions): Promise<boolean> {
  const db = await createClient();
  const concernIds = options.concerns.filter((concern) => answers.concerns.includes(concern.slug)).map((concern) => concern.id);
  const { error } = await db.from("beauty_profiles").upsert(
    {
      user_id: userId,
      skin_type_id: options.skinTypes.find((type) => type.slug === answers.skinType)?.id ?? null,
      concern_ids: concernIds,
      sensitivities: [answers.sensitivity],
      current_routine: answers.routine,
      preferences: answers.goals,
      budget_max: budgetMax(answers.budget),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[quiz] saveBeautyProfile failed", error);
  return !error;
}

/** Audit trail of what was recommended and why (service role; customers read their own). */
export async function logRecommendation(userId: string | null, answers: QuizAnswers, result: QuizResult): Promise<void> {
  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return;
  const { error } = await createAdminClient()
    .from("ai_recommendations")
    .insert({
      user_id: userId,
      profile_snapshot: answers,
      ranked_products: result.products.map((product) => ({ product_id: product.id, slug: product.card.slug, score: product.score, matched: product.matchedConcerns })),
      routine: {
        am: result.routine.am.map((entry) => ({ step: entry.step.slug, product_id: entry.product?.id ?? null })),
        pm: result.routine.pm.map((entry) => ({ step: entry.step.slug, product_id: entry.product?.id ?? null })),
      },
      explanation: "Skin Quiz: rule-based ranking by catalog concern and skin-type mappings, routine step, budget and popularity.",
      scoring_version: SCORING_VERSION,
    });
  if (error) console.error("[quiz] logRecommendation failed", error);
}

export type SavedBeautyProfile = {
  skinType: string | null;
  concerns: string[];
  sensitivity: string | null;
  routine: string[];
  budget: number | null;
  updatedAt: string;
};

/** The signed-in user's saved profile (RLS). Undefined on read failure. */
export async function getOwnBeautyProfile(options: QuizOptions | null): Promise<SavedBeautyProfile | null | undefined> {
  const db = await createClient();
  const { data, error } = await db
    .from("beauty_profiles")
    .select("skin_type_id, concern_ids, sensitivities, current_routine, budget_max, updated_at")
    .maybeSingle();
  if (error) {
    console.error("[quiz] getOwnBeautyProfile failed", error);
    return undefined;
  }
  if (!data) return null;
  const sensitivity = data.sensitivities[0];
  return {
    skinType: options?.skinTypes.find((type) => type.id === data.skin_type_id)?.name ?? null,
    concerns: (options?.concerns ?? []).filter((concern) => data.concern_ids.includes(concern.id)).map((concern) => concern.name),
    sensitivity: SENSITIVITY_OPTIONS.find((option) => option.value === sensitivity)?.label ?? null,
    routine: (options?.steps ?? []).filter((step) => data.current_routine.includes(step.slug)).map((step) => step.name),
    budget: data.budget_max,
    updatedAt: data.updated_at,
  };
}
