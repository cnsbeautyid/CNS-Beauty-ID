import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuizAnswers } from "@/services/quiz/schema";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getQuizOptions: vi.fn(),
  computeQuizResult: vi.fn(),
  logRecommendation: vi.fn(),
  saveRoutineFromPlan: vi.fn(),
  addRoutineItem: vi.fn(),
  removeRoutineItem: vi.fn(),
  getBuilderOptions: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/services/quiz/quiz", () => ({
  getQuizOptions: mocks.getQuizOptions,
  computeQuizResult: mocks.computeQuizResult,
  logRecommendation: mocks.logRecommendation,
}));
vi.mock("@/services/routine/routine", () => ({
  saveRoutineFromPlan: mocks.saveRoutineFromPlan,
  addRoutineItem: mocks.addRoutineItem,
  removeRoutineItem: mocks.removeRoutineItem,
  getBuilderOptions: mocks.getBuilderOptions,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveQuizRoutineAction, addRoutineItemAction, removeRoutineItemAction } = await import("@/features/routine/actions");

const USER = { id: "user-1", email: "a@b.c" };
const ANSWERS: QuizAnswers = { skinType: "dry", concerns: ["dull-skin"], sensitivity: "low", routine: [], goals: [], budget: "any" };
const PRODUCT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const OPTIONS = {
  steps: [
    { id: "s-m", slug: "moisturize", name: "Moisturize", order: 40, time: "both" },
    { id: "s-s", slug: "sunscreen", name: "Sunscreen", order: 50, time: "am" },
  ],
  products: [{ id: PRODUCT, name: "Moisturizer", stepSlug: "moisturize" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionUser.mockResolvedValue(USER);
  mocks.getQuizOptions.mockResolvedValue({ skinTypes: [], concerns: [], steps: [] });
  mocks.getBuilderOptions.mockResolvedValue(OPTIONS);
  mocks.addRoutineItem.mockResolvedValue("added");
  mocks.saveRoutineFromPlan.mockResolvedValue(true);
  mocks.logRecommendation.mockResolvedValue("rec-1");
});

describe("saveQuizRoutineAction", () => {
  it("requires sign-in", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await saveQuizRoutineAction(ANSWERS)).toMatchObject({ ok: false, code: "unauthenticated" });
    expect(mocks.saveRoutineFromPlan).not.toHaveBeenCalled();
  });

  it("recomputes the plan on the server and links the recommendation", async () => {
    mocks.computeQuizResult.mockResolvedValue({
      status: "ok",
      result: {
        routine: {
          am: [{ step: { slug: "moisturize", name: "Moisturize", order: 40, time: "both" }, product: { id: PRODUCT, card: {} } }],
          pm: [{ step: { slug: "moisturize", name: "Moisturize", order: 40, time: "both" }, product: null }],
        },
      },
    });
    const forged = { ...ANSWERS, ...({ plan: { am: [{ product: { id: OTHER } }] } } as object) };
    expect(await saveQuizRoutineAction(forged)).toEqual({ ok: true, message: "Rutinitas tersimpan di akunmu." });
    expect(mocks.computeQuizResult).toHaveBeenCalledWith(ANSWERS, expect.anything());
    expect(mocks.saveRoutineFromPlan).toHaveBeenCalledWith(
      "user-1",
      {
        am: [{ step: expect.objectContaining({ slug: "moisturize" }), product: { id: PRODUCT } }],
        pm: [{ step: expect.objectContaining({ slug: "moisturize" }), product: null }],
      },
      "rec-1",
    );
  });
});

describe("addRoutineItemAction", () => {
  it("adds a catalog product or the customer's own product to a known step", async () => {
    expect(await addRoutineItemAction({ stepSlug: "moisturize", productId: PRODUCT, time: "both" })).toMatchObject({ ok: true });
    expect(mocks.addRoutineItem).toHaveBeenCalledWith("user-1", { stepId: "s-m", stepOrder: 40, productId: PRODUCT, time: "both", note: undefined });
    expect(await addRoutineItemAction({ stepSlug: "moisturize", productId: null, time: "pm", note: " Serum sendiri " })).toMatchObject({ ok: true });
    expect(mocks.addRoutineItem).toHaveBeenLastCalledWith("user-1", expect.objectContaining({ productId: null, note: "Serum sendiri" }));
  });

  it("rejects unknown steps, evening sunscreen, unpublished products and duplicates", async () => {
    expect(await addRoutineItemAction({ stepSlug: "toner", productId: null, time: "am" })).toMatchObject({ ok: false, message: "Langkah rutinitas tidak dikenal." });
    expect(await addRoutineItemAction({ stepSlug: "sunscreen", productId: null, time: "pm" })).toMatchObject({ ok: false });
    expect(await addRoutineItemAction({ stepSlug: "moisturize", productId: OTHER, time: "am" })).toMatchObject({ ok: false, message: "Produk ini sudah tidak tersedia." });
    mocks.addRoutineItem.mockResolvedValue("duplicate");
    expect(await addRoutineItemAction({ stepSlug: "moisturize", productId: PRODUCT, time: "am" })).toMatchObject({ ok: false, message: "Langkah ini sudah ada di rutinitasmu." });
  });

  it("requires sign-in", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await addRoutineItemAction({ stepSlug: "moisturize", productId: null, time: "am" })).toMatchObject({ code: "unauthenticated" });
  });
});

describe("removeRoutineItemAction", () => {
  it("validates the id and reports rows it could not delete", async () => {
    expect(await removeRoutineItemAction("not-a-uuid")).toMatchObject({ ok: false });
    mocks.removeRoutineItem.mockResolvedValue(false);
    expect(await removeRoutineItemAction(PRODUCT)).toMatchObject({ ok: false });
    mocks.removeRoutineItem.mockResolvedValue(true);
    expect(await removeRoutineItemAction(PRODUCT)).toMatchObject({ ok: true });
  });
});
