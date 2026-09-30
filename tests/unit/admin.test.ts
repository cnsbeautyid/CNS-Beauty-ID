import { describe, expect, it } from "vitest";

import {
  allowedOrderActions,
  applicationDecisionSchema,
  computeKpis,
  partnerTierFor,
  productUpdateSchema,
  sanitizeSearch,
  shipSchema,
  type KpiOrder,
} from "@/services/admin/model";

const ID = "11111111-1111-4111-8111-111111111111";

describe("allowedOrderActions", () => {
  it("offers only valid next steps", () => {
    expect(allowedOrderActions("pending_payment")).toEqual(["confirm_payment", "cancel"]);
    expect(allowedOrderActions("paid")).toEqual(["start_processing", "ship"]);
    expect(allowedOrderActions("processing")).toEqual(["ship"]);
    expect(allowedOrderActions("shipped")).toEqual(["deliver"]);
    for (const status of ["delivered", "cancelled", "expired", "refunded", "payment_failed", "bogus"]) expect(allowedOrderActions(status)).toEqual([]);
  });
});

describe("computeKpis", () => {
  const order = (status: string, total: number, userId: string | null, extra: Partial<KpiOrder> = {}): KpiOrder => ({
    status,
    total,
    userId,
    partnerType: null,
    aiConversationId: null,
    ...extra,
  });

  it("counts only paid-and-later orders", () => {
    const kpis = computeKpis([
      order("paid", 100_000, "a"),
      order("delivered", 200_000, "a", { aiConversationId: "c1" }),
      order("shipped", 300_000, "b", { partnerType: "reseller" }),
      order("pending_payment", 999_000, "c"),
      order("cancelled", 999_000, "d"),
      order("paid", 50_000, null),
    ]);
    expect(kpis).toEqual({
      gmv: 650_000,
      paidOrders: 4,
      pendingPayment: 1,
      averageOrderValue: 162_500,
      repeatPurchaseRate: 0.5,
      aiAssistedGmv: 200_000,
      aiAssistedOrders: 1,
      resellerGmv: 300_000,
      resellerOrders: 1,
    });
  });

  it("has no repeat rate without paying customers", () => {
    expect(computeKpis([order("pending_payment", 1, "a")])).toMatchObject({ gmv: 0, averageOrderValue: 0, repeatPurchaseRate: null });
  });
});

describe("admin schemas", () => {
  const product = { productId: ID, price: "279000", comparePrice: "", stock: "12", lowStockThreshold: "5", status: "active", isFeatured: false };

  it("parses product edits and normalises the compare price", () => {
    expect(productUpdateSchema.parse(product)).toMatchObject({ price: 279000, comparePrice: null, stock: 12, status: "active" });
    expect(productUpdateSchema.parse({ ...product, comparePrice: "0" }).comparePrice).toBeNull();
    expect(productUpdateSchema.parse({ ...product, comparePrice: "300000" }).comparePrice).toBe(300000);
  });

  it("rejects bad product edits", () => {
    for (const bad of [{ price: "0" }, { price: "-5" }, { price: "1.5" }, { stock: "-1" }, { status: "deleted" }, { comparePrice: "100" }, { productId: "x" }]) {
      expect(productUpdateSchema.safeParse({ ...product, ...bad }).success).toBe(false);
    }
  });

  it("validates shipping details", () => {
    expect(shipSchema.parse({ orderId: ID, courier: " JNE ", trackingNumber: "JX-123456" })).toEqual({ orderId: ID, courier: "JNE", trackingNumber: "JX-123456" });
    expect(shipSchema.safeParse({ orderId: ID, courier: "JNE", trackingNumber: "<script>" }).success).toBe(false);
  });

  it("validates application decisions", () => {
    expect(applicationDecisionSchema.parse({ applicationId: ID, decision: "approve", tierLevel: "2" })).toMatchObject({ tierLevel: 2 });
    expect(applicationDecisionSchema.safeParse({ applicationId: ID, decision: "approve", tierLevel: 7 }).success).toBe(false);
    expect(applicationDecisionSchema.parse({ applicationId: ID, decision: "reject" })).toEqual({ applicationId: ID, decision: "reject" });
  });
});

describe("helpers", () => {
  it("maps partner levels", () => {
    expect(partnerTierFor("dropshipper", 3)).toBe(0);
    expect(partnerTierFor("reseller", 0)).toBe(1);
    expect(partnerTierFor("reseller", 9)).toBe(4);
    expect(partnerTierFor("reseller", 2)).toBe(2);
  });

  it("strips PostgREST filter syntax from search terms", () => {
    expect(sanitizeSearch("CNS-260930-00001")).toBe("CNS-260930-00001");
    expect(sanitizeSearch("a@b.co")).toBe("a@b.co");
    expect(sanitizeSearch("x,status.eq.paid)")).toBe("x status.eq.paid");
    expect(sanitizeSearch("%_*()")).toBe("");
    expect(sanitizeSearch(["  Sari  ", "x"])).toBe("Sari");
    expect(sanitizeSearch("a".repeat(100))).toHaveLength(60);
  });
});
