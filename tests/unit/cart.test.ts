import { describe, expect, it } from "vitest";

import {
  addItem,
  couponCodeSchema,
  EMPTY_CART,
  itemCount,
  lineKey,
  MAX_CART_LINES,
  MAX_QUANTITY,
  parseCart,
  removeItem,
  serializeCart,
  setCoupon,
  setQuantity,
  type CartState,
} from "@/services/cart/model";
import { COUPON_ERROR_CODES, quoteErrorMessage, toCartQuote } from "@/services/cart/quote-schema";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const V1 = "33333333-3333-4333-8333-333333333333";

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

describe("parseCart", () => {
  it("returns an empty cart for missing, malformed or tampered cookies", () => {
    expect(parseCart(undefined)).toEqual(EMPTY_CART);
    expect(parseCart("not json")).toEqual(EMPTY_CART);
    expect(parseCart(JSON.stringify({ v: 2, items: [] }))).toEqual(EMPTY_CART);
    expect(parseCart(JSON.stringify({ v: 1, items: [{ p: "x", q: 1 }] }))).toEqual(EMPTY_CART);
    expect(parseCart(JSON.stringify({ v: 1, items: [{ p: P1, q: 0 }] }))).toEqual(EMPTY_CART);
    expect(parseCart(JSON.stringify({ v: 1, items: [{ p: P1, q: MAX_QUANTITY + 1 }] }))).toEqual(EMPTY_CART);
  });

  it("drops price fields a tampered cookie might carry", () => {
    const cart = parseCart(JSON.stringify({ v: 1, items: [{ p: P1, q: 1, price: 1 }], total: 1 }));
    expect(cart).toEqual({ v: 1, items: [{ p: P1, q: 1 }] });
  });

  it("merges duplicate lines and clamps the merged quantity", () => {
    const cart = parseCart(JSON.stringify({ v: 1, items: [{ p: P1, q: 60 }, { p: P1, q: 60 }, { p: P1, v: V1, q: 1 }] }));
    expect(cart.items).toEqual([
      { p: P1, q: MAX_QUANTITY },
      { p: P1, v: V1, q: 1 },
    ]);
  });

  it("round-trips through serializeCart", () => {
    const cart: CartState = { v: 1, items: [{ p: P1, q: 2 }], coupon: "HEMAT10" };
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });
});

describe("cart mutations", () => {
  it("adds new lines and increments existing ones", () => {
    const first = addItem(EMPTY_CART, P1, undefined, 1);
    if (!("cart" in first)) throw new Error("expected cart");
    const second = addItem(first.cart, P1, undefined, 2);
    if (!("cart" in second)) throw new Error("expected cart");
    expect(second.cart.items).toEqual([{ p: P1, q: 3 }]);
    expect(itemCount(second.cart)).toBe(3);
  });

  it("keys variants separately", () => {
    expect(lineKey({ p: P1 })).toBe(P1);
    expect(lineKey({ p: P1, v: V1 })).toBe(`${P1}:${V1}`);
  });

  it("refuses a new line when the cart is full but still increments existing lines", () => {
    const full: CartState = { v: 1, items: Array.from({ length: MAX_CART_LINES }, (_, i) => ({ p: uuid(i), q: 1 })) };
    expect(addItem(full, P2, undefined, 1)).toEqual({ error: "cart_full" });
    const bumped = addItem(full, uuid(0), undefined, 500);
    expect("cart" in bumped && bumped.cart.items[0]?.q).toBe(MAX_QUANTITY);
  });

  it("clamps quantities to 1..MAX_QUANTITY", () => {
    const cart: CartState = { v: 1, items: [{ p: P1, q: 2 }] };
    expect(setQuantity(cart, P1, 0).items[0]?.q).toBe(1);
    expect(setQuantity(cart, P1, 1000).items[0]?.q).toBe(MAX_QUANTITY);
    expect(setQuantity(cart, P1, 3.7).items[0]?.q).toBe(3);
  });

  it("clears the coupon when the last line is removed", () => {
    const cart: CartState = { v: 1, items: [{ p: P1, q: 1 }], coupon: "HEMAT10" };
    expect(removeItem(cart, P1)).toEqual(EMPTY_CART);
  });

  it("sets and removes coupons", () => {
    const cart: CartState = { v: 1, items: [{ p: P1, q: 1 }] };
    expect(setCoupon(cart, "HEMAT10").coupon).toBe("HEMAT10");
    expect(setCoupon({ ...cart, coupon: "HEMAT10" }, undefined)).not.toHaveProperty("coupon");
  });
});

describe("couponCodeSchema", () => {
  it("normalizes and validates codes", () => {
    expect(couponCodeSchema.parse("  hemat10 ")).toBe("HEMAT10");
    expect(couponCodeSchema.safeParse("a").success).toBe(false);
    expect(couponCodeSchema.safeParse("DROP TABLE;").success).toBe(false);
  });
});

// Mirrors the JSON returned by public.quote_cart for the live catalog.
const sampleQuote = {
  lines: [
    {
      product_id: P1,
      variant_id: null,
      slug: "serum",
      name: "Serum",
      variant_name: null,
      sku: "SKU-1",
      unit_price: 150000,
      quantity: 2,
      line_total: 300000,
      image_url: null,
      stock: 5,
    },
  ],
  subtotal: 300000,
  discount_total: 0,
  points_applied: 0,
  points_discount: 0,
  shipping_total: 20000,
  total: 320000,
  coupon: null,
  free_shipping_threshold: 500000,
  pricing: "retail",
  errors: [],
};

describe("toCartQuote", () => {
  it("maps the RPC response to the view model", () => {
    const quote = toCartQuote(sampleQuote);
    expect(quote).toMatchObject({
      subtotal: 300000,
      shippingTotal: 20000,
      total: 320000,
      freeShippingThreshold: 500000,
      coupon: null,
      lines: [{ productId: P1, variantId: null, unitPrice: 150000, quantity: 2, lineTotal: 300000 }],
    });
  });

  it("rejects responses that break the contract", () => {
    expect(toCartQuote(null)).toBeNull();
    expect(toCartQuote({ ...sampleQuote, total: -1 })).toBeNull();
    expect(toCartQuote({ ...sampleQuote, total: "320000" })).toBeNull();
  });
});

describe("quoteErrorMessage", () => {
  it("explains stock and coupon errors in Indonesian", () => {
    expect(quoteErrorMessage({ code: "out_of_stock" })).toBe("Stok habis.");
    expect(quoteErrorMessage({ code: "insufficient_stock", available: 3 })).toBe("Stok tersisa 3.");
    expect(quoteErrorMessage({ code: "coupon_min_subtotal", min_subtotal: 100000 })).toMatch(/^Minimal belanja Rp/);
    expect(quoteErrorMessage({ code: "unknown_code" })).toMatch(/kendala/);
  });

  it("classifies coupon errors", () => {
    expect(COUPON_ERROR_CODES.has("coupon_expired")).toBe(true);
    expect(COUPON_ERROR_CODES.has("out_of_stock")).toBe(false);
  });
});
