import { beforeEach, describe, expect, it, vi } from "vitest";

// Checkout orchestration with Supabase, cookies and the session mocked out.
// placeOrder (services/checkout/place-order) runs for real against a fake
// admin client, so the RPC arguments and payment row are asserted end to end.

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  readCart: vi.fn(),
  writeCart: vi.fn(async () => undefined),
  quoteCart: vi.fn(),
  getCheckoutPrefill: vi.fn(),
  saveAddress: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  rpc: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/services/cart/store", () => ({ readCart: mocks.readCart, writeCart: mocks.writeCart, CartStoreError: class extends Error {} }));
vi.mock("@/services/cart/quote", () => ({ quoteCart: mocks.quoteCart }));
vi.mock("@/services/checkout/addresses", () => ({ getCheckoutPrefill: mocks.getCheckoutPrefill, saveAddress: mocks.saveAddress }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/env/server", () => ({ getServerEnv: () => ({ SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test" }) }));
vi.mock("@/lib/env/client", () => ({ getSupabasePublicConfig: () => ({ url: "https://x.supabase.co", publishableKey: "pk" }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: () => ({ insert: mocks.insert }) }),
}));
// No public client: payment settings fall back to the 24-hour default.
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => null }));

const { placeOrderAction } = await import("@/features/checkout/actions");

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "sari@example.com" };
const PRODUCT = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";
const CART = { v: 1, items: [{ p: PRODUCT, q: 2 }] };
const shipping = {
  recipientName: "Sari Dewi",
  phone: "081234567890",
  addressLine: "Jl. Melati No. 5, RT 01/RW 02",
  district: "Bekasi Timur",
  city: "Kota Bekasi",
  province: "Jawa Barat",
  postalCode: "17111",
};
const quote = (overrides: Record<string, unknown> = {}) => ({
  status: "ok",
  quote: { lines: [], subtotal: 300000, discountTotal: 0, shippingTotal: 20000, total: 320000, coupon: null, freeShippingThreshold: 500000, errors: [], ...overrides },
});

describe("placeOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue(USER);
    mocks.readCart.mockResolvedValue(CART);
    mocks.quoteCart.mockResolvedValue(quote());
    mocks.getCheckoutPrefill.mockResolvedValue({ fullName: "Sari Dewi", phone: null, addresses: [] });
  });

  it("requires a signed-in user", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await placeOrderAction({ shipping, expectedTotal: 320000 })).toMatchObject({ code: "unauthenticated" });
    expect(mocks.quoteCart).not.toHaveBeenCalled();
  });

  it("rejects invalid input and empty carts", async () => {
    expect(await placeOrderAction({ shipping: { ...shipping, postalCode: "x" }, expectedTotal: 320000 })).toMatchObject({ code: "invalid" });
    mocks.readCart.mockResolvedValue({ v: 1, items: [] });
    expect(await placeOrderAction({ shipping, expectedTotal: 320000 })).toMatchObject({ code: "empty" });
  });

  it("stops on quote errors and on a changed total", async () => {
    mocks.quoteCart.mockResolvedValue(quote({ errors: [{ code: "out_of_stock", product_id: PRODUCT }] }));
    expect(await placeOrderAction({ shipping, expectedTotal: 320000 })).toMatchObject({ code: "rejected", message: "Stok habis." });

    mocks.quoteCart.mockResolvedValue(quote({ total: 330000 }));
    const conflict = await placeOrderAction({ shipping, expectedTotal: 320000 });
    expect(conflict).toMatchObject({ code: "checkout_conflict" });
    expect(conflict.message).toMatch(/330\.000/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("places the order for the session user, clears the cart and redirects", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: true, order_id: ORDER_ID, order_number: "CNS-260930-00001", total: 320000 }, error: null });
    mocks.insert.mockResolvedValue({ error: null });

    await expect(
      placeOrderAction({ shipping, expectedTotal: 320000, saveAddress: true, ...({ userId: "attacker" } as object) }),
    ).rejects.toThrow("REDIRECT:/account/orders/CNS-260930-00001");

    expect(mocks.quoteCart).toHaveBeenCalledWith(CART, USER.id);
    expect(mocks.rpc.mock.calls[0]?.[0]).toBe("place_order");
    expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({
      p_user_id: USER.id,
      p_source: "web",
      p_points: 0,
      p_customer: { email: USER.email, name: "Sari Dewi" },
      p_items: [{ product_id: PRODUCT, variant_id: null, quantity: 2 }],
    });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ order_id: ORDER_ID, provider: "manual", amount: 320000, status: "pending" }));
    expect(mocks.writeCart).toHaveBeenCalledWith({ v: 1, items: [] });
    expect(mocks.saveAddress).toHaveBeenCalledWith(USER.id, shipping, []);
  });

  it("reports a stock race as inventory unavailable and keeps the cart", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: `insufficient_stock:${PRODUCT}` } });
    expect(await placeOrderAction({ shipping, expectedTotal: 320000 })).toMatchObject({ code: "inventory_unavailable" });
    expect(mocks.writeCart).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("surfaces backend rejections from place_order", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: false, errors: [{ code: "coupon_expired" }] }, error: null });
    expect(await placeOrderAction({ shipping, expectedTotal: 320000 })).toMatchObject({ code: "rejected", message: "Kupon sudah kedaluwarsa." });
  });

  it("treats an unexpected RPC shape as an error", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await placeOrderAction({ shipping, expectedTotal: 320000 })).toMatchObject({ code: "error" });
  });
});
