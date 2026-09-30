import type { ProductCardData } from "@/types/product";

import { budgetMax, goalConcerns, UNSURE_SKIN_TYPE, type QuizAnswers } from "./schema";

// Transparent, rule-based ranking (scoring_version below) with the owner's
// recommendation_weights. No AI and no invented claims: reasons only cite the
// catalog's own concern categories. Skin-type mappings influence the ranking
// but are never shown as "suitable/safe for" statements (claim governance).

export const SCORING_VERSION = "quiz-v1";

export type RecommendationWeights = {
  skinTypeMatch: number;
  concernMatch: number;
  routineMatch: number;
  preferenceMatch: number;
  budgetMatch: number;
  popularity: number;
};

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  skinTypeMatch: 3,
  concernMatch: 4,
  routineMatch: 2,
  preferenceMatch: 1,
  budgetMatch: 1.5,
  popularity: 0.5,
};

export type RoutineStep = { slug: string; name: string; order: number; time: "am" | "pm" | "both" };

export type QuizProduct = {
  id: string;
  card: ProductCardData;
  popularity: number;
  /** concern slug → relevance (1–3) from product_concerns. */
  concerns: Record<string, number>;
  skinTypes: string[];
  step: RoutineStep | null;
};

export type RankedProduct = {
  id: string;
  card: ProductCardData;
  score: number;
  /** Concern names from the catalog mapping, e.g. "Kulit Kusam". */
  matchedConcerns: string[];
  step: RoutineStep | null;
  overBudget: boolean;
  fillsGap: boolean;
};

const MAX_RELEVANCE = 3;

export function rankProducts(
  products: QuizProduct[],
  answers: QuizAnswers,
  weights: RecommendationWeights,
  concernNames: Record<string, string>,
): RankedProduct[] {
  const maxPrice = budgetMax(answers.budget);
  const preferred = goalConcerns(answers.goals).filter((concern) => !answers.concerns.includes(concern));
  const topPopularity = Math.max(1, ...products.map((product) => product.popularity));

  return products
    .map((product) => {
      const main = answers.concerns.filter((concern) => product.concerns[concern]);
      const concernScore = main.reduce((sum, concern) => sum + (product.concerns[concern] ?? 0) / MAX_RELEVANCE, 0) / answers.concerns.length;
      const preferenceScore = preferred.length
        ? preferred.reduce((sum, concern) => sum + (product.concerns[concern] ?? 0) / MAX_RELEVANCE, 0) / preferred.length
        : 0;
      const skinTypeScore = answers.skinType !== UNSURE_SKIN_TYPE && product.skinTypes.includes(answers.skinType) ? 1 : 0;
      const fillsGap = Boolean(product.step && !answers.routine.includes(product.step.slug));
      const overBudget = maxPrice !== null && product.card.price.amount > maxPrice;

      const score =
        weights.concernMatch * concernScore +
        weights.preferenceMatch * preferenceScore +
        weights.skinTypeMatch * skinTypeScore +
        weights.routineMatch * (fillsGap ? 1 : 0) +
        weights.budgetMatch * (overBudget ? 0 : 1) +
        weights.popularity * (product.popularity / topPopularity);

      const matched = [...new Set([...main, ...preferred.filter((concern) => product.concerns[concern])])];
      return {
        id: product.id,
        card: product.card,
        score: Math.round(score * 100) / 100,
        matchedConcerns: matched.map((concern) => concernNames[concern] ?? concern),
        step: product.step,
        overBudget,
        fillsGap,
      };
    })
    // Only products the catalog maps to what the customer asked about.
    .filter((product) => product.matchedConcerns.length > 0)
    .sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name));
}

export type RoutinePlan = {
  am: { step: RoutineStep; product: RankedProduct | null }[];
  pm: { step: RoutineStep; product: RankedProduct | null }[];
};

/**
 * AM/PM order from routine_steps. Each step gets the best recommended product
 * for it, or null (a step the customer can cover with what they already use).
 * Only steps that have a recommendation or that the customer already does.
 */
export function buildRoutine(ranked: RankedProduct[], steps: RoutineStep[], currentRoutine: string[]): RoutinePlan {
  const byStep = new Map<string, RankedProduct>();
  for (const product of ranked) if (product.step && !byStep.has(product.step.slug)) byStep.set(product.step.slug, product);

  const plan = (time: "am" | "pm") =>
    [...steps]
      .filter((step) => step.time === "both" || step.time === time)
      .filter((step) => byStep.has(step.slug) || currentRoutine.includes(step.slug))
      .sort((a, b) => a.order - b.order)
      .map((step) => ({ step, product: byStep.get(step.slug) ?? null }));

  return { am: plan("am"), pm: plan("pm") };
}

/** General care guidance only; never a diagnosis or a product claim. */
export function safetyNotes(answers: QuizAnswers): string[] {
  const notes: string[] = [];
  if (answers.sensitivity !== "low") {
    notes.push("Coba produk baru satu per satu dan lakukan uji tempel (patch test) di area kecil selama 24 jam sebelum pemakaian rutin.");
  }
  if (answers.sensitivity === "high" || (answers.concerns.includes("acne-prone") && answers.sensitivity !== "low")) {
    notes.push("Jika kulit sering meradang, perih, atau berjerawat parah, konsultasikan dengan dokter kulit. Rekomendasi ini bukan diagnosis medis.");
  }
  if (!answers.routine.includes("sunscreen")) {
    notes.push("Gunakan tabir surya setiap pagi sebagai langkah terakhir rutinitas.");
  }
  return notes;
}
