import { z } from "zod";

import { phoneSchema, shippingSchema } from "@/services/checkout/schema";

const optionalPhone = z.union([z.literal(""), phoneSchema]);

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Masukkan nama lengkap.").max(80, "Nama terlalu panjang."),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  birthDate: z.union([
    z.literal(""),
    z.iso.date("Tanggal tidak valid.").refine((value) => value <= new Date().toISOString().slice(0, 10), "Tanggal lahir tidak boleh di masa depan."),
  ]),
  marketingOptIn: z.boolean(),
  whatsappOptIn: z.boolean(),
});

export type ProfileValues = z.input<typeof profileSchema>;
export type ProfileInput = z.output<typeof profileSchema>;

export const addressSchema = shippingSchema.extend({
  label: z.string().trim().max(40, "Label maksimal 40 karakter.").optional().transform((value) => value || undefined),
});

export type AddressValues = z.input<typeof addressSchema>;

/** The only profile columns a customer may change (matches the column grants). */
export function toProfileUpdate(input: ProfileInput) {
  return {
    full_name: input.fullName,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    birth_date: input.birthDate || null,
    marketing_opt_in: input.marketingOptIn,
    whatsapp_opt_in: input.whatsappOptIn,
  };
}

export const ORDERS_PAGE_SIZE = 10;

export function parsePage(value: unknown): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}
