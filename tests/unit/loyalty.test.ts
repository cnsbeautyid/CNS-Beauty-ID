import { describe, expect, it } from "vitest";

import { describeRule, eventLabel, parseLoyaltySettings, parsePointsParam, tierProgress, type Tier } from "@/services/loyalty/model";

const tier = (slug: string, min: number): Tier => ({ id: slug, slug, name: slug.toUpperCase(), minLifetimePoints: min, benefits: [] });

describe("tierProgress", () => {
  it("is at the top with a single tier", () => {
    expect(tierProgress(0, [tier("glow", 0)])).toMatchObject({ current: { slug: "glow" }, next: null, remaining: 0, percent: 100 });
  });

  it("measures progress toward the next tier", () => {
    const tiers = [tier("radiant", 5000), tier("glow", 0), tier("luminous", 20000)];
    expect(tierProgress(2500, tiers)).toMatchObject({ current: { slug: "glow" }, next: { slug: "radiant" }, remaining: 2500, percent: 50 });
    expect(tierProgress(12500, tiers)).toMatchObject({ current: { slug: "radiant" }, next: { slug: "luminous" }, remaining: 7500, percent: 50 });
    expect(tierProgress(25000, tiers)).toMatchObject({ current: { slug: "luminous" }, next: null });
  });

  it("handles no tiers", () => {
    expect(tierProgress(100, [])).toEqual({ current: null, next: null, remaining: 0, percent: 100 });
  });
});

describe("rules and settings", () => {
  it("describes rules from their own numbers", () => {
    expect(describeRule({ event: "purchase", points: 1, perAmount: 100, description: "x" })).toBe("1 poin untuk setiap Rp 100 yang dibayarkan");
    expect(describeRule({ event: "review", points: 50, perAmount: null, description: null })).toBe("50 poin");
    expect(describeRule({ event: "birthday", points: 0, perAmount: null, description: "Bonus ulang tahun" })).toBe("Bonus ulang tahun");
    expect(eventLabel("redemption")).toBe("Penukaran");
    expect(eventLabel("mystery")).toBe("Aktivitas poin");
  });

  it("parses the owner's settings defensively", () => {
    expect(parseLoyaltySettings({ point_value: 1, max_redeem_percent: 50 })).toEqual({ pointValue: 1, maxRedeemPercent: 50 });
    expect(parseLoyaltySettings({ point_value: "1", max_redeem_percent: 500 })).toEqual({ pointValue: 0, maxRedeemPercent: 0 });
    expect(parseLoyaltySettings(null)).toEqual({ pointValue: 0, maxRedeemPercent: 0 });
  });

  it("parses ?poin= and treats anything odd as zero", () => {
    expect(parsePointsParam("2500")).toBe(2500);
    expect(parsePointsParam(["300", "9"])).toBe(300);
    for (const bad of [undefined, "", "-5", "1.5", "abc", "99999999999"]) expect(parsePointsParam(bad)).toBe(0);
  });
});
