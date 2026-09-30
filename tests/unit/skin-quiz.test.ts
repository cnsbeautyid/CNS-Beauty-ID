import { describe, expect, it } from "vitest";

import { budgetMax, goalConcerns, quizAnswersSchema, type QuizAnswers } from "@/services/quiz/schema";
import { buildRoutine, DEFAULT_WEIGHTS, rankProducts, safetyNotes, type QuizProduct, type RoutineStep } from "@/services/quiz/scoring";

const steps: RoutineStep[] = [
  { slug: "cleanse", name: "Cleanse", order: 10, time: "both" },
  { slug: "serum", name: "Serum", order: 30, time: "both" },
  { slug: "moisturize", name: "Moisturize", order: 40, time: "both" },
  { slug: "sunscreen", name: "Sunscreen", order: 50, time: "am" },
  { slug: "body-care", name: "Body Care", order: 60, time: "both" },
];
const step = (slug: string) => steps.find((entry) => entry.slug === slug) ?? null;

const product = (id: string, amount: number, concerns: Record<string, number>, stepSlug: string, popularity = 0): QuizProduct => ({
  id,
  card: { slug: id, name: `Produk ${id}`, price: { amount, currency: "IDR" }, availability: "in_stock" },
  popularity,
  concerns,
  skinTypes: ["normal", "dry"],
  step: step(stepSlug),
});

const answers = (overrides: Partial<QuizAnswers> = {}): QuizAnswers => ({
  skinType: "dry",
  concerns: ["dull-skin"],
  sensitivity: "low",
  routine: ["cleanse", "sunscreen"],
  goals: [],
  budget: "any",
  ...overrides,
});

const names = { "dull-skin": "Kulit Kusam", "dry-skin": "Kulit Kering", "acne-prone": "Mudah Berjerawat", "body-care": "Perawatan Tubuh" };

describe("quiz answers", () => {
  it("validates the six answers", () => {
    expect(quizAnswersSchema.safeParse(answers()).success).toBe(true);
    expect(quizAnswersSchema.safeParse(answers({ concerns: [] })).success).toBe(false);
    expect(quizAnswersSchema.safeParse(answers({ concerns: ["a", "b", "c", "d"] })).success).toBe(false);
    expect(quizAnswersSchema.safeParse({ ...answers(), sensitivity: "extreme" }).success).toBe(false);
    expect(quizAnswersSchema.safeParse({ ...answers(), skinType: "<script>" }).success).toBe(false);
  });

  it("maps budgets and goals", () => {
    expect(budgetMax("under-150k")).toBe(150_000);
    expect(budgetMax("any")).toBeNull();
    expect(goalConcerns(["hydrated", "brighter", "hydrated"])).toEqual(["dry-skin", "dehydrated-skin", "dull-skin"]);
  });
});

describe("rankProducts", () => {
  const catalog = [
    product("serum", 200_000, { "dull-skin": 3 }, "serum"),
    product("lotion", 120_000, { "dull-skin": 1, "dry-skin": 3 }, "body-care"),
    product("cleanser", 90_000, { "acne-prone": 3 }, "cleanse"),
  ];

  it("ranks by concern relevance and drops unrelated products", () => {
    const ranked = rankProducts(catalog, answers(), DEFAULT_WEIGHTS, names);
    expect(ranked.map((entry) => entry.id)).toEqual(["serum", "lotion"]);
    expect(ranked[0]).toMatchObject({ matchedConcerns: ["Kulit Kusam"], fillsGap: true, overBudget: false });
  });

  it("flags products over budget and uses goals as a softer signal", () => {
    const plain = rankProducts(catalog, answers(), DEFAULT_WEIGHTS, names);
    const tuned = rankProducts(catalog, answers({ budget: "under-150k", goals: ["hydrated"] }), DEFAULT_WEIGHTS, names);
    const score = (list: typeof plain, id: string) => list.find((entry) => entry.id === id)?.score ?? 0;

    expect(tuned.find((entry) => entry.id === "serum")?.overBudget).toBe(true);
    expect(score(tuned, "serum")).toBeCloseTo(score(plain, "serum") - DEFAULT_WEIGHTS.budgetMatch);
    expect(score(tuned, "lotion")).toBeCloseTo(score(plain, "lotion") + DEFAULT_WEIGHTS.preferenceMatch * 0.5);
    expect(tuned.find((entry) => entry.id === "lotion")?.matchedConcerns).toEqual(["Kulit Kusam", "Kulit Kering"]);
  });

  it("gives no skin-type bonus when the customer is unsure", () => {
    const [sure] = rankProducts(catalog, answers(), DEFAULT_WEIGHTS, names);
    const [unsure] = rankProducts(catalog, answers({ skinType: "unsure" }), DEFAULT_WEIGHTS, names);
    expect((sure?.score ?? 0) - (unsure?.score ?? 0)).toBeCloseTo(DEFAULT_WEIGHTS.skinTypeMatch);
  });
});

describe("buildRoutine", () => {
  it("orders AM/PM steps and keeps the customer's existing steps", () => {
    const ranked = rankProducts([product("serum", 1, { "dull-skin": 3 }, "serum")], answers(), DEFAULT_WEIGHTS, names);
    const plan = buildRoutine(ranked, steps, ["cleanse", "sunscreen"]);
    expect(plan.am.map((entry) => [entry.step.slug, entry.product?.id ?? null])).toEqual([
      ["cleanse", null],
      ["serum", "serum"],
      ["sunscreen", null],
    ]);
    expect(plan.pm.map((entry) => entry.step.slug)).toEqual(["cleanse", "serum"]);
  });
});

describe("safetyNotes", () => {
  it("adds care guidance without diagnosing", () => {
    expect(safetyNotes(answers())).toEqual([]);
    const notes = safetyNotes(answers({ sensitivity: "high", concerns: ["acne-prone"], routine: [] }));
    expect(notes).toHaveLength(3);
    expect(notes.join(" ")).toContain("patch test");
    expect(notes.join(" ")).toContain("bukan diagnosis medis");
    expect(notes.join(" ")).toContain("tabir surya");
  });
});
