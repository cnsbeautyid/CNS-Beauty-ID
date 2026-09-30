import { beforeEach, describe, expect, it, vi } from "vitest";

// Partner application action and the partner-only AI tools, with the reseller
// services mocked. Partner status always comes from the (mocked) RLS read,
// never from the input.

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getOwnPartner: vi.fn(),
  getOwnApplication: vi.fn(),
  submitApplication: vi.fn(),
  getPartnerPriceList: vi.fn(),
  listPartnerOrders: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/services/reseller/reseller", () => ({
  getOwnPartner: mocks.getOwnPartner,
  getOwnApplication: mocks.getOwnApplication,
  submitApplication: mocks.submitApplication,
  getPartnerPriceList: mocks.getPartnerPriceList,
  listPartnerOrders: mocks.listPartnerOrders,
}));
// Customer tools' dependencies are irrelevant here.
for (const path of [
  "@/services/catalog/products",
  "@/services/catalog/product-detail",
  "@/services/order/order",
  "@/services/cart/store",
  "@/services/cart/quote",
  "@/services/content/contact",
  "@/services/ai/knowledge",
  "@/services/quiz/quiz",
  "@/services/routine/routine",
  "@/services/loyalty/loyalty",
]) {
  vi.doMock(path, () => ({}));
}

const { submitApplicationAction } = await import("@/features/reseller/actions");
const { CONCIERGE_TOOLS, PARTNER_TOOLS } = await import("@/services/ai/tools");

const VALID = { memberType: "reseller", desiredLevel: 2, fullName: "Sari", phone: "081234567890", city: "Bandung", salesChannel: "Instagram" } as const;
const PARTNER = { memberType: "reseller", tierLevel: 1, storeName: "Toko Sari" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "a@b.c" });
  mocks.getOwnPartner.mockResolvedValue(null);
  mocks.getOwnApplication.mockResolvedValue(null);
  mocks.submitApplication.mockResolvedValue(true);
});

describe("submitApplicationAction", () => {
  it("requires sign-in and valid input", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await submitApplicationAction(VALID)).toMatchObject({ ok: false, code: "unauthenticated" });
    mocks.getSessionUser.mockResolvedValue({ id: "user-1" });
    expect(await submitApplicationAction({ ...VALID, phone: "12" })).toMatchObject({ ok: false, code: "invalid" });
    expect(mocks.submitApplication).not.toHaveBeenCalled();
  });

  it("submits for the session user only, without browser-supplied status", async () => {
    const result = await submitApplicationAction({ ...VALID, status: "approved", user_id: "someone-else" } as never);
    expect(result).toMatchObject({ ok: true });
    expect(mocks.submitApplication).toHaveBeenCalledWith("user-1", expect.not.objectContaining({ status: expect.anything() }));
    expect(mocks.submitApplication.mock.calls[0]?.[1]).not.toHaveProperty("user_id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/reseller");
  });

  it("does not duplicate partners or pending applications", async () => {
    mocks.getOwnPartner.mockResolvedValue(PARTNER);
    expect(await submitApplicationAction(VALID)).toMatchObject({ ok: false, code: "duplicate" });
    mocks.getOwnPartner.mockResolvedValue(null);
    mocks.getOwnApplication.mockResolvedValue({ status: "pending", memberType: "reseller", createdAt: "2026-09-30T00:00:00Z" });
    expect(await submitApplicationAction(VALID)).toMatchObject({ ok: false, code: "duplicate" });
    mocks.getOwnApplication.mockResolvedValue({ status: "rejected", memberType: "reseller", createdAt: "2026-09-30T00:00:00Z" });
    expect(await submitApplicationAction(VALID)).toMatchObject({ ok: true });
  });

  it("reports a failed insert", async () => {
    mocks.submitApplication.mockResolvedValue(false);
    expect(await submitApplicationAction(VALID)).toMatchObject({ ok: false, code: "error" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("partner AI tools", () => {
  const names = (registry: typeof CONCIERGE_TOOLS) => registry.definitions.map((tool) => tool.function.name);

  it("are only in the partner registry", async () => {
    expect(names(CONCIERGE_TOOLS)).not.toContain("get_partner_prices");
    expect(names(PARTNER_TOOLS)).toEqual(expect.arrayContaining(["get_partner_prices", "get_partner_sales_summary", "search_products"]));
    expect(JSON.parse((await CONCIERGE_TOOLS.run("get_partner_prices", "{}", { userId: "user-1" })).content).error).toMatch(/tidak dikenal/);
  });

  it("re-check the partner account on every call", async () => {
    expect(JSON.parse((await PARTNER_TOOLS.run("get_partner_prices", "{}", { userId: null })).content)).toMatchObject({ requires_login: true });
    expect(JSON.parse((await PARTNER_TOOLS.run("get_partner_prices", "{}", { userId: "user-1" })).content)).toMatchObject({ not_partner: true });
    expect(JSON.parse((await PARTNER_TOOLS.run("get_partner_sales_summary", "{}", { userId: "user-1" })).content)).toMatchObject({ not_partner: true });
    expect(mocks.getPartnerPriceList).not.toHaveBeenCalled();
    expect(mocks.listPartnerOrders).not.toHaveBeenCalled();
  });

  it("return database prices and state there is no commission", async () => {
    mocks.getOwnPartner.mockResolvedValue(PARTNER);
    mocks.getPartnerPriceList.mockResolvedValue([
      {
        productId: "p1",
        slug: "licorice",
        name: "Licorice Serum",
        retailPrice: 279000,
        available: true,
        own: { level: 1, name: "Starter", minQty: 10, unitPrice: 229000 },
        marginPerUnit: 50000,
        tiers: [{ level: 1, name: "Starter", minQty: 10, unitPrice: 229000 }],
      },
      { productId: "p2", slug: "lotion", name: "Body Lotion", retailPrice: 255000, available: false, own: null, marginPerUnit: null, tiers: [] },
    ]);
    const outcome = JSON.parse((await PARTNER_TOOLS.run("get_partner_prices", '{"query":"licorice"}', { userId: "user-1" })).content);
    expect(outcome).toMatchObject({ partner_level: 1, commission_program: false });
    expect(outcome.products).toEqual([
      expect.objectContaining({ name: "Licorice Serum", your_price: "Rp 229.000", your_min_qty: 10, margin_per_unit_at_retail_price: "Rp 50.000" }),
    ]);
  });

  it("summarise the partner's own orders", async () => {
    mocks.getOwnPartner.mockResolvedValue(PARTNER);
    mocks.listPartnerOrders.mockResolvedValue([
      { orderNumber: "CNS-1", status: "paid", total: 2290000, createdAt: new Date().toISOString(), isDropship: false, items: [{ name: "Licorice", quantity: 10, lineTotal: 2290000 }] },
    ]);
    const outcome = JSON.parse((await PARTNER_TOOLS.run("get_partner_sales_summary", "{}", { userId: "user-1" })).content);
    expect(outcome).toMatchObject({ paid_orders: 1, paid_purchase_total: "Rp 2.290.000", top_products: [{ name: "Licorice", quantity: 10 }] });
    mocks.listPartnerOrders.mockResolvedValue(null);
    expect(JSON.parse((await PARTNER_TOOLS.run("get_partner_sales_summary", "{}", { userId: "user-1" })).content)).toMatchObject({ error: expect.any(String) });
  });
});
