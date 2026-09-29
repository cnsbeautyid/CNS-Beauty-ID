import { describe, expect, it } from "vitest";

import { articlePath, orderPath, productCategoryPath, productPath, ROUTES } from "@/constants/routes";

describe("route helpers", () => {
  it("builds Indonesian SEO URLs", () => {
    expect(productPath("serum-dna-salmon")).toBe("/produk/serum-dna-salmon");
    expect(productCategoryPath("serum")).toBe("/produk/kategori/serum");
    expect(articlePath("ritual-pagi")).toBe("/artikel/ritual-pagi");
  });

  it("normalizes and encodes slugs", () => {
    expect(productPath("  Face Mist ")).toBe("/produk/face%20mist");
    expect(productPath("../admin")).toBe("/produk/..%2Fadmin");
  });

  it("encodes order numbers", () => {
    expect(orderPath("CNS/2026/001")).toBe("/account/orders/CNS%2F2026%2F001");
  });

  it("keeps the reseller portal separate from the public reseller page", () => {
    expect(ROUTES.resellerProgram).toBe("/reseller");
    expect(ROUTES.resellerPortal.dashboard).toBe("/reseller-portal");
  });

  it("has no duplicate paths", () => {
    const collect = (value: unknown): string[] =>
      typeof value === "string" ? [value] : Object.values(value as object).flatMap(collect);
    const paths = collect(ROUTES);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
