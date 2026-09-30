import { beforeEach, describe, expect, it, vi } from "vitest";

// The account cart store and "Pesan lagi" against an in-memory fake of the
// Supabase query builder. RLS itself is verified on the live DB separately.

vi.mock("server-only", () => ({}));

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  trackServerEvent: vi.fn(),
  userId: null as string | null,
  tables: {} as Record<string, Row[]>,
  cookie: undefined as string | undefined,
  nextId: 1,
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

function query(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  let op: { kind: "select" | "insert" | "update" | "delete"; values?: Row | Row[] } = { kind: "select" };
  const rows = () => (state.tables[table] ??= []);
  const matching = () => rows().filter((row) => filters.every((f) => f(row)));
  const withRelations = (row: Row) =>
    table === "carts" ? { ...row, cart_items: (state.tables.cart_items ?? []).filter((item) => item.cart_id === row.id) } : row;
  const run = () => {
    if (op.kind === "insert") {
      const inserted = [op.values].flat().map((values) => ({ id: `id-${state.nextId++}`, created_at: new Date(state.nextId * 1000).toISOString(), ...values }));
      rows().push(...inserted);
      return { data: inserted, error: null };
    }
    if (op.kind === "update") {
      for (const row of matching()) Object.assign(row, op.values);
      return { data: null, error: null };
    }
    if (op.kind === "delete") {
      state.tables[table] = rows().filter((row) => !filters.every((f) => f(row)));
      return { data: null, error: null };
    }
    return { data: matching().map(withRelations), error: null };
  };
  const builder = {
    select: () => builder,
    insert: (values: Row | Row[]) => ((op = { kind: "insert", values }), builder),
    update: (values: Row) => ((op = { kind: "update", values }), builder),
    delete: () => ((op = { kind: "delete" }), builder),
    eq: (column: string, value: unknown) => (filters.push((row) => row[column] === value), builder),
    neq: (column: string, value: unknown) => (filters.push((row) => row[column] !== value), builder),
    in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(row[column])), builder),
    maybeSingle: async () => ({ data: run().data?.[0] ?? null, error: null }),
    single: async () => ({ data: run().data?.[0], error: null }),
    then: (resolve: (value: unknown) => void) => resolve(run()),
  };
  return builder;
}

const fakeDb = {
  auth: { getClaims: async () => (state.userId ? { data: { claims: { sub: state.userId } }, error: null } : { data: null, error: null }) },
  // RLS stand-in: signed-in users only see their own carts/orders.
  from: (table: string) => {
    const builder = query(table);
    if (["carts", "orders"].includes(table) && state.userId) builder.eq("user_id", state.userId);
    return builder;
  },
};

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeDb }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ from: (table: string) => query(table) }) }));
vi.mock("@/lib/env/client", () => ({ getSupabasePublicConfig: () => ({ url: "https://x.supabase.co", publishableKey: "pk" }) }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({}) }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: async () => (state.userId ? { id: state.userId, email: "sari@example.com" } : null) }));
vi.mock("@/services/cart/cookie", () => ({
  readCookieCart: async () => (await import("@/services/cart/model")).parseCart(state.cookie),
  writeCookieCart: async (cart: { items: unknown[] }) => {
    state.cookie = cart.items.length ? JSON.stringify(cart) : undefined;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/services/analytics/record", () => ({ trackServerEvent: state.trackServerEvent }));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));

const store = await import("@/services/cart/store");
const { reorderAction } = await import("@/features/order/actions");

const USER = "11111111-1111-4111-8111-111111111111";
const P1 = "22222222-2222-4222-8222-222222222222";
const P2 = "33333333-3333-4333-8333-333333333333";
const GONE = "44444444-4444-4444-8444-444444444444";
const ORDER = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  state.userId = null;
  state.cookie = undefined;
  state.tables = { products: [{ id: P1, status: "active" }, { id: P2, status: "active" }, { id: GONE, status: "archived" }] };
});

describe("cart store", () => {
  it("uses the cookie for guests", async () => {
    await store.writeCart({ v: 1, items: [{ p: P1, q: 2 }] });
    expect(JSON.parse(state.cookie ?? "{}")).toEqual({ v: 1, items: [{ p: P1, q: 2 }] });
    expect(state.tables.carts).toBeUndefined();
  });

  it("persists signed-in carts in carts/cart_items with minimal changes", async () => {
    state.userId = USER;
    await store.writeCart({ v: 1, items: [{ p: P1, q: 2 }, { p: P2, q: 1 }], coupon: "HEMAT10" });
    expect(state.tables.carts).toHaveLength(1);
    expect(state.tables.carts?.[0]).toMatchObject({ user_id: USER, coupon_code: "HEMAT10" });
    expect(state.tables.cart_items).toHaveLength(2);

    await store.writeCart({ v: 1, items: [{ p: P1, q: 5 }] });
    expect(state.tables.cart_items).toEqual([expect.objectContaining({ product_id: P1, quantity: 5, added_from: "web" })]);
    expect(state.tables.carts?.[0]?.coupon_code).toBeNull();
    expect(await store.readCart()).toEqual({ v: 1, items: [{ p: P1, q: 5 }] });
  });

  it("merges the guest cart at sign-in and clears the cookie", async () => {
    state.cookie = JSON.stringify({ v: 1, items: [{ p: P1, q: 1 }] });
    state.userId = USER;
    await store.writeCart({ v: 1, items: [{ p: P1, q: 2 }] });
    await store.mergeGuestCart(fakeDb as never, USER);
    expect(await store.readCart()).toEqual({ v: 1, items: [{ p: P1, q: 3 }] });
    expect(state.cookie).toBeUndefined();
  });
});

describe("reorderAction", () => {
  it("requires sign-in", async () => {
    expect(await reorderAction(ORDER)).toEqual({ ok: false, message: "Sesi berakhir. Silakan masuk kembali." });
  });

  it("adds the still-active products of the user's own order and opens the cart", async () => {
    state.userId = USER;
    const items = [
      { order_id: ORDER, product_id: P1, variant_id: null, quantity: 2 },
      { order_id: ORDER, product_id: GONE, variant_id: null, quantity: 1 },
      { order_id: ORDER, product_id: null, variant_id: null, quantity: 1 },
    ];
    state.tables.orders = [{ id: ORDER, user_id: USER, order_items: items }];

    await expect(reorderAction(ORDER)).rejects.toThrow("REDIRECT:/cart");
    expect(await store.readCart()).toEqual({ v: 1, items: [{ p: P1, q: 2 }] });
    expect(state.trackServerEvent).toHaveBeenCalledWith("ADD_TO_CART", { properties: { quantity: 1, source: "reorder" } });
  });

  it("does not expose other customers' orders", async () => {
    state.userId = USER;
    state.tables.orders = [{ id: ORDER, user_id: "someone-else", order_items: [] }];
    expect(await reorderAction(ORDER)).toEqual({ ok: false, message: "Pesanan tidak ditemukan." });
  });
});
