import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuizAnswers } from "@/services/quiz/schema";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getQuizOptions: vi.fn(),
  computeQuizResult: vi.fn(),
  saveBeautyProfile: vi.fn(),
  logRecommendation: vi.fn(),
  readCart: vi.fn(),
  writeCart: vi.fn(),
  products: [] as { id: string; stock: number; status: string }[],
}));

vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/services/quiz/quiz", () => ({
  getQuizOptions: mocks.getQuizOptions,
  computeQuizResult: mocks.computeQuizResult,
  saveBeautyProfile: mocks.saveBeautyProfile,
  logRecommendation: mocks.logRecommendation,
}));
vi.mock("@/services/cart/store", () => ({ readCart: mocks.readCart, writeCart: mocks.writeCart, CartStoreError: class extends Error {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({
    from: () => {
      const filters: ((row: { id: string; stock: number; status: string }) => boolean)[] = [];
      const builder = {
        select: () => builder,
        eq: (column: "status", value: string) => (filters.push((row) => row[column] === value), builder),
        in: (column: "id", values: string[]) => (filters.push((row) => values.includes(row[column])), builder),
        then: (resolve: (value: unknown) => void) => resolve({ data: mocks.products.filter((row) => filters.every((f) => f(row))), error: null }),
      };
      return builder;
    },
  }),
}));

const { submitSkinQuizAction, saveSkinProfileAction, addRoutineToCartAction } = await import("@/features/skin-quiz/actions");

const OPTIONS = { skinTypes: [{ id: "st", slug: "dry", name: "Kering" }], concerns: [{ id: "c", slug: "dull-skin", name: "Kulit Kusam" }], steps: [] };
const ANSWERS: QuizAnswers = { skinType: "dry", concerns: ["dull-skin"], sensitivity: "low", routine: [], goals: [], budget: "any" };
const RESULT = { profile: {}, products: [], routine: { am: [], pm: [] }, notes: [] };
const IN_STOCK = "11111111-1111-4111-8111-111111111111";
const SOLD_OUT = "22222222-2222-4222-8222-222222222222";
const ARCHIVED = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getQuizOptions.mockResolvedValue(OPTIONS);
  mocks.computeQuizResult.mockResolvedValue({ status: "ok", result: RESULT });
  mocks.saveBeautyProfile.mockResolvedValue(true);
  mocks.readCart.mockResolvedValue({ v: 1, items: [] });
  mocks.writeCart.mockResolvedValue(undefined);
  mocks.products = [
    { id: IN_STOCK, stock: 5, status: "active" },
    { id: SOLD_OUT, stock: 0, status: "active" },
    { id: ARCHIVED, stock: 9, status: "archived" },
  ];
});

describe("submitSkinQuizAction", () => {
  it("scores for guests without saving a profile, and logs the run", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await submitSkinQuizAction(ANSWERS)).toEqual({ ok: true, result: RESULT, saved: false });
    expect(mocks.saveBeautyProfile).not.toHaveBeenCalled();
    expect(mocks.logRecommendation).toHaveBeenCalledWith(null, ANSWERS, RESULT);
  });

  it("saves the profile for the session user only", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "a@b.c" });
    expect(await submitSkinQuizAction({ ...ANSWERS, ...({ userId: "attacker" } as object) })).toMatchObject({ ok: true, saved: true });
    expect(mocks.saveBeautyProfile).toHaveBeenCalledWith("user-1", ANSWERS, OPTIONS);
  });

  it("rejects incomplete or unknown answers", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await submitSkinQuizAction({ ...ANSWERS, concerns: [] })).toMatchObject({ ok: false });
    expect(await submitSkinQuizAction({ ...ANSWERS, skinType: "alien" })).toEqual({ ok: false, message: "Jenis kulit tidak dikenali." });
    expect(mocks.computeQuizResult).not.toHaveBeenCalled();
  });
});

describe("saveSkinProfileAction", () => {
  it("asks guests to sign in", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await saveSkinProfileAction(ANSWERS)).toMatchObject({ ok: false, code: "unauthenticated" });
  });
});

describe("addRoutineToCartAction", () => {
  it("adds only active, in-stock products", async () => {
    const outcome = await addRoutineToCartAction([IN_STOCK, SOLD_OUT, ARCHIVED]);
    expect(outcome).toEqual({ ok: true, added: 1, skipped: 2, count: 1 });
    expect(mocks.writeCart).toHaveBeenCalledWith({ v: 1, items: [{ p: IN_STOCK, q: 1 }] });
  });

  it("refuses when nothing is available, and validates ids", async () => {
    expect(await addRoutineToCartAction([SOLD_OUT])).toMatchObject({ ok: false });
    expect(await addRoutineToCartAction(["not-a-uuid"])).toEqual({ ok: false, message: "Permintaan tidak valid." });
    expect(mocks.writeCart).not.toHaveBeenCalled();
  });
});
