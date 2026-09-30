import { beforeEach, describe, expect, it, vi } from "vitest";

// Admin server actions with the admin services mocked. Staff status comes
// only from authorizeStaff() (user_roles via RLS); nothing in the payload can
// grant it. Every successful mutation is audited.

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authorizeStaff: vi.fn(),
  recordAudit: vi.fn(),
  updateProduct: vi.fn(),
  setStock: vi.fn(),
  reviewContent: vi.fn(),
  confirmPayment: vi.fn(),
  cancelOrder: vi.fn(),
  transitionOrder: vi.fn(),
  decideApplication: vi.fn(),
  updatePartner: vi.fn(),
  decideKnowledge: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/services/admin/auth", () => ({ authorizeStaff: mocks.authorizeStaff }));
vi.mock("@/services/admin/audit", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("@/services/admin/catalog", () => ({ updateProduct: mocks.updateProduct, setStock: mocks.setStock, reviewContent: mocks.reviewContent }));
vi.mock("@/services/admin/orders", () => ({ confirmPayment: mocks.confirmPayment, cancelOrder: mocks.cancelOrder, transitionOrder: mocks.transitionOrder }));
vi.mock("@/services/admin/people", () => ({ decideApplication: mocks.decideApplication, updatePartner: mocks.updatePartner }));
vi.mock("@/services/admin/knowledge", () => ({ decideKnowledge: mocks.decideKnowledge }));

const actions = await import("@/features/admin/actions");

const ID = "11111111-1111-4111-8111-111111111111";
const STAFF = { id: "staff-1", email: "admin@cns.test", roles: ["admin"], isOwner: false };
const PRODUCT = { productId: ID, price: 279000, comparePrice: "", stock: 12, lowStockThreshold: 5, status: "active", isFeatured: false };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorizeStaff.mockResolvedValue(STAFF);
  mocks.recordAudit.mockResolvedValue(true);
});

describe("authorization", () => {
  it("refuses every action for non-staff, whatever the payload claims", async () => {
    mocks.authorizeStaff.mockResolvedValue(null);
    const calls = [
      actions.updateProductAction({ ...PRODUCT, role: "owner" }),
      actions.setStockAction({ productId: ID, stock: 5 }),
      actions.reviewContentAction({ kind: "benefit", id: ID, decision: "approve" }),
      actions.orderAction({ orderId: ID, action: "confirm_payment" }),
      actions.shipOrderAction({ orderId: ID, courier: "JNE", trackingNumber: "JX1" }),
      actions.decideApplicationAction({ applicationId: ID, decision: "approve", tierLevel: 1 }),
      actions.updatePartnerAction({ userId: ID, isActive: true, tierLevel: 1 }),
      actions.decideKnowledgeAction({ id: ID, decision: "approve" }),
    ];
    for (const result of await Promise.all(calls)) expect(result).toEqual({ ok: false, message: "Akses ditolak." });
    for (const service of [mocks.updateProduct, mocks.setStock, mocks.reviewContent, mocks.confirmPayment, mocks.transitionOrder, mocks.decideApplication, mocks.updatePartner, mocks.decideKnowledge]) {
      expect(service).not.toHaveBeenCalled();
    }
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });
});

describe("products and inventory", () => {
  it("validates, updates and audits the changed fields", async () => {
    mocks.updateProduct.mockResolvedValue({ name: "Licorice", changes: { price: { from: 279000, to: 259000 } } });
    expect(await actions.updateProductAction({ ...PRODUCT, price: 259000 })).toEqual({ ok: true, message: "Produk disimpan." });
    expect(mocks.updateProduct).toHaveBeenCalledWith(expect.objectContaining({ productId: ID, price: 259000, comparePrice: null }));
    expect(mocks.recordAudit).toHaveBeenCalledWith({ action: "product.update", entityType: "product", entityId: ID, summary: { name: "Licorice", changes: { price: { from: 279000, to: 259000 } } } });
  });

  it("skips the audit entry when nothing changed, and reports field errors", async () => {
    mocks.updateProduct.mockResolvedValue({ name: "Licorice", changes: {} });
    await actions.updateProductAction(PRODUCT);
    expect(mocks.recordAudit).not.toHaveBeenCalled();
    const invalid = await actions.updateProductAction({ ...PRODUCT, price: 0 });
    expect(invalid).toMatchObject({ ok: false, fieldErrors: { price: expect.any(String) } });
  });

  it("sets stock and audits from/to", async () => {
    mocks.setStock.mockResolvedValue({ name: "Licorice", from: 0 });
    expect(await actions.setStockAction({ productId: ID, stock: "40" })).toMatchObject({ ok: true });
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "inventory.set_stock", summary: { name: "Licorice", from: 0, to: 40 } }));
    expect(await actions.setStockAction({ productId: ID, stock: -1 })).toMatchObject({ ok: false });
  });

  it("approves claims through the reviewed service", async () => {
    mocks.reviewContent.mockResolvedValue("product-1");
    expect(await actions.reviewContentAction({ kind: "benefit", id: ID, decision: "approve", evidenceReference: "Lab 2026-01" })).toMatchObject({ ok: true });
    expect(mocks.reviewContent).toHaveBeenCalledWith("benefit", ID, "approve", "Lab 2026-01");
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "claim.approve", entityType: "benefit" }));
    expect(await actions.reviewContentAction({ kind: "products", id: ID, decision: "approve" })).toMatchObject({ ok: false });
  });
});

describe("orders", () => {
  it("confirms payment via the ledger function and audits it", async () => {
    mocks.confirmPayment.mockResolvedValue({ ok: true, orderNumber: "CNS-1" });
    expect(await actions.orderAction({ orderId: ID, action: "confirm_payment" })).toEqual({ ok: true, message: "Pembayaran dikonfirmasi." });
    expect(mocks.recordAudit).toHaveBeenCalledWith({ action: "order.mark_paid", entityType: "order", entityId: ID, summary: { orderNumber: "CNS-1" } });
  });

  it("requires a reason to cancel", async () => {
    expect(await actions.orderAction({ orderId: ID, action: "cancel" })).toMatchObject({ ok: false, fieldErrors: { note: expect.any(String) } });
    expect(mocks.cancelOrder).not.toHaveBeenCalled();
    mocks.cancelOrder.mockResolvedValue({ ok: true, orderNumber: "CNS-1" });
    expect(await actions.orderAction({ orderId: ID, action: "cancel", note: "Permintaan pelanggan" })).toMatchObject({ ok: true });
    expect(mocks.cancelOrder).toHaveBeenCalledWith(ID, "Permintaan pelanggan");
  });

  it("passes the verified staff id to fulfilment transitions", async () => {
    mocks.transitionOrder.mockResolvedValue({ ok: true, orderNumber: "CNS-1" });
    await actions.shipOrderAction({ orderId: ID, courier: "JNE", trackingNumber: "JX-9" });
    expect(mocks.transitionOrder).toHaveBeenCalledWith(ID, "ship", "staff-1", { courier: "JNE", trackingNumber: "JX-9" });
    await actions.orderAction({ orderId: ID, action: "deliver" });
    expect(mocks.transitionOrder).toHaveBeenLastCalledWith(ID, "deliver", "staff-1", { note: undefined });
  });

  it("explains failures without auditing", async () => {
    mocks.confirmPayment.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect(await actions.orderAction({ orderId: ID, action: "confirm_payment" })).toMatchObject({ ok: false, message: expect.stringContaining("kunci layanan") });
    mocks.transitionOrder.mockResolvedValue({ ok: false, reason: "invalid_state" });
    expect(await actions.orderAction({ orderId: ID, action: "deliver" })).toMatchObject({ ok: false, message: expect.stringContaining("sudah berubah") });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
    expect(await actions.orderAction({ orderId: ID, action: "refund" })).toMatchObject({ ok: false });
  });
});

describe("partners and knowledge", () => {
  it("approves an application as the verified staff member", async () => {
    mocks.decideApplication.mockResolvedValue({ ok: true, userId: "u1", memberType: "reseller", tierLevel: 2 });
    expect(await actions.decideApplicationAction({ applicationId: ID, decision: "approve", tierLevel: "2", approved_by: "someone" })).toMatchObject({ ok: true });
    expect(mocks.decideApplication).toHaveBeenCalledWith(ID, "staff-1", { applicationId: ID, decision: "approve", tierLevel: 2, storeName: undefined });
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "partner.approve", summary: { userId: "u1", memberType: "reseller", tierLevel: 2 } }));
  });

  it("does not approve twice", async () => {
    mocks.decideApplication.mockResolvedValue({ ok: false, reason: "invalid_state" });
    expect(await actions.decideApplicationAction({ applicationId: ID, decision: "reject" })).toMatchObject({ ok: false, message: "Pendaftaran ini sudah diputuskan." });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("approves knowledge documents and audits the transition", async () => {
    mocks.decideKnowledge.mockResolvedValue({ title: "Brand story", from: "pending_review", to: "approved" });
    expect(await actions.decideKnowledgeAction({ id: ID, decision: "approve" })).toMatchObject({ ok: true, message: expect.stringContaining("Beauty AI") });
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "knowledge.approve", summary: { title: "Brand story", from: "pending_review", to: "approved" } }));
  });
});
