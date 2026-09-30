import "server-only";

import { clientEnv } from "@/lib/env/client";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_CARD_COLUMNS, toProductCard, type ProductCardRow } from "@/services/catalog/mapper";

import { itemsFromPlan, splitByTime, type ItemInsert, type PlanEntry, type RoutineItemView, type RoutineTime, type RoutineView } from "./model";

// The signed-in customer's routine. Everything runs as the user, so RLS
// (own_all_user_routines / own_all_user_routine_items) is the authorization.
// One routine per customer is shown: the most recently updated.

export const DEFAULT_ROUTINE_NAME = "Rutinitas Saya";

type Db = Awaited<ReturnType<typeof createClient>>;

export type OwnRoutine = { id: string; name: string; source: string; updatedAt: string; view: RoutineView };

const ITEM_COLUMNS = `id, time_of_day, step_order, note, product_id, routine_steps(slug, name, step_order), products(id, how_to_use, ${PRODUCT_CARD_COLUMNS})` as const;

export async function getOwnRoutine(): Promise<OwnRoutine | null | undefined> {
  const db = await createClient();
  const { data, error } = await db
    .from("user_routines")
    .select(`id, name, source, updated_at, user_routine_items(${ITEM_COLUMNS})`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[routine] getOwnRoutine failed", error);
    return undefined;
  }
  if (!data) return null;

  const items: RoutineItemView[] = data.user_routine_items.map((item) => {
    const product = item.products as (ProductCardRow & { id: string; how_to_use: string | null }) | null;
    return {
      id: item.id,
      step: item.routine_steps ? { slug: item.routine_steps.slug, name: item.routine_steps.name, order: item.routine_steps.step_order } : null,
      product: product
        ? { id: product.id, card: toProductCard(product, clientEnv.NEXT_PUBLIC_SUPABASE_URL), howToUse: product.how_to_use ?? undefined }
        : null,
      // RLS hides unpublished products, so a set id without a product row means "no longer sold".
      unavailable: Boolean(item.product_id && !product),
      time: item.time_of_day as RoutineTime,
      note: item.note,
    };
  });
  return { id: data.id, name: data.name, source: data.source, updatedAt: data.updated_at, view: splitByTime(items) };
}

async function latestRoutineId(db: Db): Promise<string | null> {
  const { data } = await db.from("user_routines").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data?.id ?? null;
}

async function ensureRoutine(db: Db, userId: string, source: "builder" | "ai", recommendationId: string | null): Promise<string | null> {
  const existing = await latestRoutineId(db);
  if (existing) {
    const { error } = await db
      .from("user_routines")
      .update({ source, ai_recommendation_id: recommendationId, updated_at: new Date().toISOString() })
      .eq("id", existing);
    return error ? null : existing;
  }
  const { data, error } = await db
    .from("user_routines")
    .insert({ user_id: userId, name: DEFAULT_ROUTINE_NAME, source, ai_recommendation_id: recommendationId })
    .select("id")
    .single();
  if (error) console.error("[routine] create failed", error);
  return data?.id ?? null;
}

async function stepIdsBySlug(): Promise<Record<string, string>> {
  const db = createPublicClient();
  if (!db) return {};
  const { data } = await db.from("routine_steps").select("id, slug");
  return Object.fromEntries((data ?? []).map((step) => [step.slug, step.id]));
}

/** Replaces the routine with a quiz plan (the server recomputed it from the answers). */
export async function saveRoutineFromPlan(userId: string, plan: { am: PlanEntry[]; pm: PlanEntry[] }, recommendationId: string | null): Promise<boolean> {
  const db = await createClient();
  const routineId = await ensureRoutine(db, userId, "ai", recommendationId);
  if (!routineId) return false;
  const rows: ItemInsert[] = itemsFromPlan(plan, await stepIdsBySlug());
  const cleared = await db.from("user_routine_items").delete().eq("user_routine_id", routineId);
  if (cleared.error) {
    console.error("[routine] clearing items failed", cleared.error);
    return false;
  }
  if (rows.length === 0) return true;
  const { error } = await db.from("user_routine_items").insert(rows.map((row) => ({ ...row, user_routine_id: routineId })));
  if (error) console.error("[routine] inserting items failed", error);
  return !error;
}

export type AddItemResult = "added" | "duplicate" | "error";

export async function addRoutineItem(
  userId: string,
  item: { stepId: string; stepOrder: number; productId: string | null; time: RoutineTime; note?: string },
): Promise<AddItemResult> {
  const db = await createClient();
  const routineId = (await latestRoutineId(db)) ?? (await ensureRoutine(db, userId, "builder", null));
  if (!routineId) return "error";

  let duplicate = db
    .from("user_routine_items")
    .select("id", { count: "exact", head: true })
    .eq("user_routine_id", routineId)
    .eq("routine_step_id", item.stepId)
    .eq("time_of_day", item.time);
  duplicate = item.productId ? duplicate.eq("product_id", item.productId) : duplicate.is("product_id", null);
  const { count } = await duplicate;
  if ((count ?? 0) > 0) return "duplicate";

  const { error } = await db.from("user_routine_items").insert({
    user_routine_id: routineId,
    routine_step_id: item.stepId,
    product_id: item.productId,
    step_order: item.stepOrder,
    time_of_day: item.time,
    note: item.note ?? null,
  });
  if (error) {
    console.error("[routine] addRoutineItem failed", error);
    return "error";
  }
  await db.from("user_routines").update({ source: "builder", updated_at: new Date().toISOString() }).eq("id", routineId);
  return "added";
}

export async function removeRoutineItem(itemId: string): Promise<boolean> {
  const db = await createClient();
  const { error, count } = await db.from("user_routine_items").delete({ count: "exact" }).eq("id", itemId);
  if (error) console.error("[routine] removeRoutineItem failed", error);
  return !error && (count ?? 0) > 0;
}

export type BuilderOptions = {
  steps: { id: string; slug: string; name: string; order: number; time: RoutineTime }[];
  products: { id: string; name: string; stepSlug: string | null }[];
};

/** Choices for the routine builder: all steps and every published product. */
export async function getBuilderOptions(): Promise<BuilderOptions | null> {
  const db = createPublicClient();
  if (!db) return null;
  const [steps, products] = await Promise.all([
    db.from("routine_steps").select("id, slug, name, step_order, time_of_day").order("step_order"),
    db.from("products").select("id, name, routine_steps!products_routine_step_id_fkey(slug)").eq("status", "active").order("name"),
  ]);
  if (steps.error || products.error) {
    console.error("[routine] getBuilderOptions failed", steps.error ?? products.error);
    return null;
  }
  return {
    steps: steps.data.map((step) => ({ id: step.id, slug: step.slug, name: step.name, order: step.step_order, time: step.time_of_day as RoutineTime })),
    products: products.data.map((product) => ({ id: product.id, name: product.name, stepSlug: product.routine_steps?.slug ?? null })),
  };
}
