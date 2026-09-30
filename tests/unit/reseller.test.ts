import { describe, expect, it } from "vitest";

import { buildContextNote } from "@/services/ai/prompt";
import { applicationSchema, buildPriceRow, summarizeSales, type PartnerOrder } from "@/services/reseller/model";

const product = { id: "p1", slug: "licorice", name: "Licorice", price: 279000, available: true };
const tiers = [
  { level: 2, name: "Silver", minQty: 30, unitPrice: 219000 },
  { level: 1, name: "Starter", minQty: 10, unitPrice: 229000 },
];

describe("buildPriceRow", () => {
  it("picks the partner's own level and a factual per-unit margin", () => {
    const row = buildPriceRow(product, tiers, 1);
    expect(row.own).toMatchObject({ name: "Starter", minQty: 10, unitPrice: 229000 });
    expect(row.marginPerUnit).toBe(50000);
    expect(row.tiers.map((tier) => tier.level)).toEqual([1, 2]);
  });

  it("has no own price or margin when the level has no tier", () => {
    expect(buildPriceRow(product, tiers, 4)).toMatchObject({ own: null, marginPerUnit: null });
    expect(buildPriceRow(product, [], 1)).toMatchObject({ own: null, tiers: [] });
  });
});

describe("summarizeSales", () => {
  const order = (status: string, total: number, createdAt: string, items: PartnerOrder["items"] = []): PartnerOrder => ({ status, total, createdAt, items });
  const now = new Date("2026-09-30T10:00:00Z");

  it("counts only paid-and-later orders, by Jakarta month", () => {
    const summary = summarizeSales(
      [
        order("paid", 2290000, "2026-09-02T03:00:00Z", [{ name: "Licorice", quantity: 10, lineTotal: 2290000 }]),
        order("delivered", 1000000, "2026-08-31T18:00:00Z", [{ name: "Lotion", quantity: 5, lineTotal: 1000000 }]), // 1 Sep in Jakarta
        order("pending_payment", 500000, "2026-09-10T03:00:00Z"),
        order("cancelled", 900000, "2026-09-11T03:00:00Z"),
        order("paid", 700000, "2025-12-01T03:00:00Z"), // outside the window
      ],
      now,
    );
    expect(summary).toMatchObject({ purchaseTotal: 3990000, paidOrders: 3, pendingOrders: 1 });
    expect(summary.months).toHaveLength(6);
    expect(summary.months.at(-1)).toMatchObject({ key: "2026-09", total: 3290000 });
    expect(summary.months[0]?.key).toBe("2026-04");
    expect(summary.topProducts).toEqual([
      { name: "Licorice", quantity: 10, total: 2290000 },
      { name: "Lotion", quantity: 5, total: 1000000 },
    ]);
  });

  it("is empty without orders", () => {
    expect(summarizeSales([], now)).toMatchObject({ purchaseTotal: 0, paidOrders: 0, pendingOrders: 0, topProducts: [] });
  });
});

describe("applicationSchema", () => {
  const base = { memberType: "reseller", desiredLevel: "3", fullName: "Sari", phone: "0812-3456-7890", city: "Bandung", salesChannel: "Instagram" };

  it("parses a reseller application and normalises optional text", () => {
    expect(applicationSchema.parse({ ...base, storeName: " ", message: "" })).toEqual({
      memberType: "reseller",
      desiredLevel: 3,
      fullName: "Sari",
      phone: "081234567890",
      city: "Bandung",
      salesChannel: "Instagram",
      storeName: undefined,
      message: undefined,
    });
  });

  it("forces dropshippers to level 1 and rejects bad input", () => {
    expect(applicationSchema.parse({ ...base, memberType: "dropshipper", desiredLevel: 4 }).desiredLevel).toBe(1);
    expect(applicationSchema.safeParse({ ...base, desiredLevel: 5 }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, memberType: "admin" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...base, phone: "123" }).success).toBe(false);
  });

  it("ignores status or approval fields from the browser", () => {
    const parsed = applicationSchema.parse({ ...base, status: "approved", reviewed_by: "x", tierLevel: 4 });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("reviewed_by");
    expect(parsed).not.toHaveProperty("tierLevel");
  });
});

describe("partner context note", () => {
  it("only switches to partner mode for a server-verified partner", () => {
    expect(buildContextNote({ pageType: "reseller" })).toBe("Konteks halaman: pelanggan berada di halaman reseller.");
    const note = buildContextNote({ pageType: "reseller" }, { typeLabel: "Reseller", level: 2 }) ?? "";
    expect(note).toContain("Reseller CNS Beauty yang sudah disetujui (level 2)");
    expect(note).toContain("bukan komisi");
    expect(note).toContain("get_partner_prices");
  });
});
