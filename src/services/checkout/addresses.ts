import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ShippingDetails } from "./schema";

export type SavedAddress = ShippingDetails & { id: string; label: string | null; isDefault: boolean };
export type CheckoutPrefill = { fullName: string | null; phone: string | null; addresses: SavedAddress[] };

/** Profile and saved addresses of the signed-in user (RLS: own rows only). */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill> {
  const empty: CheckoutPrefill = { fullName: null, phone: null, addresses: [] };
  try {
    const db = await createClient();
    const [profile, addresses] = await Promise.all([
      db.from("profiles").select("full_name, phone, whatsapp").maybeSingle(),
      db
        .from("addresses")
        .select("id, label, recipient_name, phone, address_line, district, city, province, postal_code, is_default")
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(10),
    ]);
    if (profile.error) console.error("[checkout] profile prefill failed", profile.error);
    if (addresses.error) console.error("[checkout] address prefill failed", addresses.error);
    return {
      fullName: profile.data?.full_name ?? null,
      phone: profile.data?.whatsapp ?? profile.data?.phone ?? null,
      addresses: (addresses.data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        isDefault: row.is_default,
        recipientName: row.recipient_name,
        phone: row.phone,
        addressLine: row.address_line,
        district: row.district,
        city: row.city,
        province: row.province,
        postalCode: row.postal_code,
      })),
    };
  } catch (error) {
    console.error("[checkout] getCheckoutPrefill failed", error);
    return empty;
  }
}

const ADDRESS_FIELDS = ["recipientName", "phone", "addressLine", "district", "city", "province", "postalCode"] as const;

const sameAddress = (a: ShippingDetails, b: ShippingDetails) =>
  ADDRESS_FIELDS.every((key) => a[key].trim().toLowerCase() === b[key].trim().toLowerCase());

/** Saves the checkout address to the user's address book (skips duplicates). */
export async function saveAddress(userId: string, shipping: ShippingDetails, existing: SavedAddress[]): Promise<void> {
  if (existing.some((address) => sameAddress(address, shipping))) return;
  const db = await createClient();
  const { error } = await db.from("addresses").insert({
    user_id: userId,
    recipient_name: shipping.recipientName,
    phone: shipping.phone,
    address_line: shipping.addressLine,
    district: shipping.district,
    city: shipping.city,
    province: shipping.province,
    postal_code: shipping.postalCode,
    is_default: existing.length === 0,
  });
  if (error) console.error("[checkout] saving address failed", error);
}
