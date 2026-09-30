import type { ProductCardData } from "@/types/product";

// Pure routine shaping, shared by the routine service and tests.

export type RoutineTime = "am" | "pm" | "both";

export type RoutineItemView = {
  id: string;
  step: { slug: string; name: string; order: number } | null;
  /** null: the customer's own product for this step (or a product no longer sold). */
  product: { id: string; card: ProductCardData; howToUse?: string } | null;
  /** A product was set but is no longer published. */
  unavailable: boolean;
  time: RoutineTime;
  note: string | null;
};

export type RoutineView = { am: RoutineItemView[]; pm: RoutineItemView[] };

const order = (item: RoutineItemView) => item.step?.order ?? Number.MAX_SAFE_INTEGER;

/** "both" items appear in the morning and evening lists, each sorted by step order. */
export function splitByTime(items: RoutineItemView[]): RoutineView {
  const sorted = [...items].sort((a, b) => order(a) - order(b) || (a.product?.card.name ?? "").localeCompare(b.product?.card.name ?? ""));
  return {
    am: sorted.filter((item) => item.time !== "pm"),
    pm: sorted.filter((item) => item.time !== "am"),
  };
}

export type PlanEntry = { step: { slug: string; order: number }; product: { id: string } | null };
export type ItemInsert = { time_of_day: RoutineTime; routine_step_id: string | null; product_id: string | null; step_order: number };

/**
 * Turns an AM/PM plan into item rows. A step with the same product in both
 * lists becomes one "both" row; everything else keeps its time of day.
 */
export function itemsFromPlan(plan: { am: PlanEntry[]; pm: PlanEntry[] }, stepIds: Record<string, string>): ItemInsert[] {
  const key = (entry: PlanEntry) => `${entry.step.slug}:${entry.product?.id ?? ""}`;
  const pmKeys = new Set(plan.pm.map(key));
  const amKeys = new Set(plan.am.map(key));
  const row = (entry: PlanEntry, time: RoutineTime): ItemInsert => ({
    time_of_day: time,
    routine_step_id: stepIds[entry.step.slug] ?? null,
    product_id: entry.product?.id ?? null,
    step_order: entry.step.order,
  });
  return [
    ...plan.am.map((entry) => row(entry, pmKeys.has(key(entry)) ? "both" : "am")),
    ...plan.pm.filter((entry) => !amKeys.has(key(entry))).map((entry) => row(entry, "pm")),
  ];
}

/** Product ids worth adding to the cart: published and in stock, once each. */
export function purchasableProductIds(view: RoutineView): string[] {
  const ids = [...view.am, ...view.pm]
    .filter((item) => item.product && item.product.card.availability !== "out_of_stock")
    .map((item) => item.product!.id);
  return [...new Set(ids)];
}
