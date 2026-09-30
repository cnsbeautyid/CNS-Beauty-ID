import { describe, expect, it } from "vitest";

import { addressSchema, parsePage, profileSchema, toProfileUpdate } from "@/services/account/schemas";

const profile = {
  fullName: "Sari Dewi",
  phone: "",
  whatsapp: "0812 3456 7890",
  birthDate: "1995-04-12",
  marketingOptIn: false,
  whatsappOptIn: true,
};

describe("profileSchema", () => {
  it("accepts optional phones and dates", () => {
    const parsed = profileSchema.parse(profile);
    expect(parsed.whatsapp).toBe("081234567890");
    expect(toProfileUpdate(parsed)).toEqual({
      full_name: "Sari Dewi",
      phone: null,
      whatsapp: "081234567890",
      birth_date: "1995-04-12",
      marketing_opt_in: false,
      whatsapp_opt_in: true,
    });
  });

  it("rejects bad input", () => {
    expect(profileSchema.safeParse({ ...profile, fullName: "S" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, phone: "12" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, birthDate: "2999-01-01" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, birthDate: "12/04/1995" }).success).toBe(false);
  });

  it("only maps columns the customer may change", () => {
    const update = toProfileUpdate(profileSchema.parse({ ...profile, email: "x@y.z", referral_code: "HACK" }));
    expect(Object.keys(update).sort()).toEqual(["birth_date", "full_name", "marketing_opt_in", "phone", "whatsapp", "whatsapp_opt_in"]);
  });
});

describe("addressSchema", () => {
  it("adds an optional label to the shipping address", () => {
    const address = {
      label: "  ",
      recipientName: "Sari",
      phone: "081234567890",
      addressLine: "Jl. Melati No. 5, RT 01/RW 02",
      district: "Bekasi Timur",
      city: "Kota Bekasi",
      province: "Jawa Barat",
      postalCode: "17111",
    };
    expect(addressSchema.parse(address).label).toBeUndefined();
    expect(addressSchema.parse({ ...address, label: "Rumah" }).label).toBe("Rumah");
    expect(addressSchema.safeParse({ ...address, label: "x".repeat(41) }).success).toBe(false);
  });
});

describe("parsePage", () => {
  it("falls back to page 1 for anything unexpected", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);
    for (const bad of [undefined, "0", "-1", "1.5", "abc", "5000"]) expect(parsePage(bad)).toBe(1);
  });
});
