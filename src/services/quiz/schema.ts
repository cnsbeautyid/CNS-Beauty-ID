import { z } from "zod";

// Skin Quiz answers (PRD §19). Options that aren't catalog data (sensitivity,
// goals, budget) live here; skin types, concerns and routine steps come from
// the database. Pure, shared by client, server and tests.

export const SENSITIVITY_OPTIONS = [
  { value: "low", label: "Jarang bermasalah", hint: "Kulit jarang kemerahan atau perih saat mencoba produk baru." },
  { value: "some", label: "Kadang sensitif", hint: "Sesekali kemerahan, gatal, atau perih." },
  { value: "high", label: "Mudah iritasi", hint: "Sering bereaksi terhadap produk baru." },
] as const;

/** Desired results, each mapped to catalog concern slugs (a softer signal than main concerns). */
export const GOAL_OPTIONS = [
  { value: "brighter", label: "Kulit tampak lebih cerah", concerns: ["dull-skin"] },
  { value: "hydrated", label: "Lebih lembap dan terhidrasi", concerns: ["dry-skin", "dehydrated-skin"] },
  { value: "even", label: "Warna kulit lebih merata", concerns: ["uneven-tone"] },
  { value: "clear", label: "Membantu merawat kulit berjerawat", concerns: ["acne-prone"] },
  { value: "smooth", label: "Tampilan garis halus tersamarkan", concerns: ["fine-lines"] },
  { value: "body", label: "Perawatan kulit tubuh", concerns: ["body-care"] },
] as const;

export const BUDGET_OPTIONS = [
  { value: "under-150k", label: "Di bawah Rp150.000 per produk", max: 150_000 },
  { value: "150k-300k", label: "Rp150.000 – Rp300.000 per produk", max: 300_000 },
  { value: "over-300k", label: "Di atas Rp300.000 per produk", max: null },
  { value: "any", label: "Tidak ada batas", max: null },
] as const;

export const UNSURE_SKIN_TYPE = "unsure";
export const MAX_CONCERNS = 3;

const slug = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const quizAnswersSchema = z.object({
  skinType: slug,
  concerns: z.array(slug).min(1, "Pilih minimal satu kebutuhan kulit.").max(MAX_CONCERNS, `Pilih maksimal ${MAX_CONCERNS}.`),
  sensitivity: z.enum(SENSITIVITY_OPTIONS.map((option) => option.value) as ["low", "some", "high"]),
  routine: z.array(slug).max(10),
  goals: z.array(z.enum(GOAL_OPTIONS.map((option) => option.value) as [string, ...string[]])).max(GOAL_OPTIONS.length),
  budget: z.enum(BUDGET_OPTIONS.map((option) => option.value) as [string, ...string[]]),
});

export type QuizAnswers = z.infer<typeof quizAnswersSchema>;

export function budgetMax(budget: QuizAnswers["budget"]): number | null {
  return BUDGET_OPTIONS.find((option) => option.value === budget)?.max ?? null;
}

export function goalConcerns(goals: QuizAnswers["goals"]): string[] {
  return [...new Set(goals.flatMap((goal) => GOAL_OPTIONS.find((option) => option.value === goal)?.concerns ?? []))];
}
