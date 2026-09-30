import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/utils/format";
import { authErrorMessage } from "@/services/auth/errors";
import { safeNextPath, signInSchema, signUpSchema } from "@/services/auth/schemas";
import { parsePaymentSettings } from "@/services/checkout/payment-settings";
import { checkoutSchema, phoneSchema, shippingSchema } from "@/services/checkout/schema";
import { orderStatusInfo } from "@/services/order/status";

const shipping = {
  recipientName: "Sari Dewi",
  phone: "0812-3456-7890",
  addressLine: "Jl. Melati No. 5, RT 01/RW 02",
  district: "Bekasi Timur",
  city: "Kota Bekasi",
  province: "Jawa Barat",
  postalCode: "17111",
};

describe("safeNextPath", () => {
  it("allows same-origin relative paths only", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/account/orders/CNS-1?x=1")).toBe("/account/orders/CNS-1?x=1");
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "checkout", undefined, 42, `/${"a".repeat(600)}`]) {
      expect(safeNextPath(bad, "/")).toBe("/");
    }
  });
});

describe("auth schemas", () => {
  it("normalizes email and enforces password rules", () => {
    expect(signInSchema.parse({ email: "  Sari@Example.COM ", password: "x" }).email).toBe("sari@example.com");
    expect(signUpSchema.safeParse({ fullName: "Sari", email: "sari@example.com", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Sari", email: "not-an-email", password: "longenough" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Sari", email: "sari@example.com", password: "longenough" }).success).toBe(true);
  });

  it("maps auth error codes to Indonesian messages", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Email atau kata sandi salah.");
    expect(authErrorMessage("email_not_confirmed")).toMatch(/belum dikonfirmasi/);
    expect(authErrorMessage(undefined)).toMatch(/kendala/);
  });
});

describe("checkout schema", () => {
  it("accepts Indonesian mobile numbers in common formats", () => {
    expect(phoneSchema.parse("0812-3456-7890")).toBe("081234567890");
    expect(phoneSchema.parse("+62 812 3456 7890")).toBe("+6281234567890");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("0212345678").success).toBe(false);
  });

  it("validates the shipping address", () => {
    expect(shippingSchema.safeParse(shipping).success).toBe(true);
    expect(shippingSchema.safeParse({ ...shipping, postalCode: "1711" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...shipping, addressLine: "Jl. A" }).success).toBe(false);
  });

  it("drops empty notes and never carries prices or identity", () => {
    const parsed = checkoutSchema.parse({ shipping, notes: "  ", expectedTotal: 150000, userId: "attacker", total: 1 });
    expect(parsed.notes).toBeUndefined();
    expect(parsed.saveAddress).toBe(false);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("total");
    expect(checkoutSchema.safeParse({ shipping, expectedTotal: -1 }).success).toBe(false);
  });
});

describe("parsePaymentSettings", () => {
  it("defaults when the row is missing or empty", () => {
    expect(parsePaymentSettings(undefined)).toEqual({ expiryHours: 24, bankAccounts: [] });
    expect(parsePaymentSettings({ expiry_hours: 24, bank_accounts: [], note: null })).toEqual({ expiryHours: 24, bankAccounts: [] });
  });

  it("keeps valid accounts and drops malformed ones", () => {
    const settings = parsePaymentSettings({
      expiry_hours: 12,
      bank_accounts: [
        { bank: "BCA", account_number: "123 456 7890", account_name: "CNS Beauty" },
        { bank: "", account_number: "123", account_name: "x" },
        "garbage",
      ],
      note: "Cantumkan nomor pesanan.",
    });
    expect(settings).toEqual({
      expiryHours: 12,
      bankAccounts: [{ bank: "BCA", accountNumber: "123 456 7890", accountName: "CNS Beauty" }],
      note: "Cantumkan nomor pesanan.",
    });
    expect(parsePaymentSettings({ expiry_hours: 9999 }).expiryHours).toBe(24);
  });
});

describe("order presentation", () => {
  it("labels statuses and tolerates unknown ones", () => {
    expect(orderStatusInfo("pending_payment").label).toBe("Menunggu pembayaran");
    expect(orderStatusInfo("expired").label).toBe("Kedaluwarsa");
    expect(orderStatusInfo("something_new").label).toBe("Status tidak diketahui");
  });

  it("formats times in Jakarta time", () => {
    expect(formatDateTime("2026-09-30T07:05:00Z")).toMatch(/30 September 2026.*14[.:]05 WIB$/);
  });
});
