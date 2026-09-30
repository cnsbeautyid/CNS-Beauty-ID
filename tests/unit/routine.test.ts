import { describe, expect, it } from "vitest";

import { itemsFromPlan, purchasableProductIds, splitByTime, type RoutineItemView } from "@/services/routine/model";

const item = (id: string, stepOrder: number, time: RoutineItemView["time"], product?: { id: string; available?: boolean }): RoutineItemView => ({
  id,
  step: { slug: `step-${stepOrder}`, name: `Langkah ${stepOrder}`, order: stepOrder },
  product: product
    ? {
        id: product.id,
        card: { slug: product.id, name: `Produk ${product.id}`, price: { amount: 1, currency: "IDR" }, availability: product.available === false ? "out_of_stock" : "in_stock" },
      }
    : null,
  unavailable: false,
  time,
  note: null,
});

describe("splitByTime", () => {
  it("puts 'both' items in both lists, sorted by step order", () => {
    const view = splitByTime([item("c", 40, "both"), item("a", 10, "am"), item("b", 30, "pm"), item("d", 10, "both")]);
    expect(view.am.map((entry) => entry.id)).toEqual(["a", "d", "c"]);
    expect(view.pm.map((entry) => entry.id)).toEqual(["d", "b", "c"]);
  });
});

describe("itemsFromPlan", () => {
  it("merges identical AM/PM entries into one 'both' row and keeps step ids", () => {
    const plan = {
      am: [
        { step: { slug: "cleanse", order: 10 }, product: null },
        { step: { slug: "moisturize", order: 40 }, product: { id: "p1" } },
        { step: { slug: "sunscreen", order: 50 }, product: null },
      ],
      pm: [
        { step: { slug: "cleanse", order: 10 }, product: null },
        { step: { slug: "moisturize", order: 40 }, product: { id: "p1" } },
        { step: { slug: "serum", order: 30 }, product: { id: "p2" } },
      ],
    };
    expect(itemsFromPlan(plan, { cleanse: "s-c", moisturize: "s-m", sunscreen: "s-s" })).toEqual([
      { time_of_day: "both", routine_step_id: "s-c", product_id: null, step_order: 10 },
      { time_of_day: "both", routine_step_id: "s-m", product_id: "p1", step_order: 40 },
      { time_of_day: "am", routine_step_id: "s-s", product_id: null, step_order: 50 },
      { time_of_day: "pm", routine_step_id: null, product_id: "p2", step_order: 30 },
    ]);
  });
});

describe("purchasableProductIds", () => {
  it("returns in-stock CNS products once", () => {
    const view = splitByTime([item("a", 10, "both", { id: "p1" }), item("b", 20, "pm", { id: "p2", available: false }), item("c", 30, "am")]);
    expect(purchasableProductIds(view)).toEqual(["p1"]);
  });
});
