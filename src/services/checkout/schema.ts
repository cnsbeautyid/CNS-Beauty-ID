import { z } from "zod";

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, "Terlalu panjang.");

/** Indonesian mobile number, stored as entered minus spaces/dashes. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Masukkan nomor HP yang valid, contoh 081234567890."));

export const shippingSchema = z.object({
  recipientName: text(2, 80, "Masukkan nama penerima."),
  phone: phoneSchema,
  addressLine: text(10, 300, "Tulis alamat lengkap (jalan, nomor rumah, RT/RW)."),
  district: text(2, 80, "Masukkan kecamatan."),
  city: text(2, 80, "Masukkan kota/kabupaten."),
  province: text(2, 80, "Masukkan provinsi."),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos terdiri dari 5 angka."),
});

export const checkoutSchema = z.object({
  shipping: shippingSchema,
  notes: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter.")
    .optional()
    .transform((value) => value || undefined),
  saveAddress: z.boolean().default(false),
  /** Loyalty points the customer chose (capped server-side at the balance and max_redeem_percent). */
  points: z.number().int().min(0).max(10_000_000).default(0),
  /** The total the customer saw. A mismatch with a fresh quote is a checkout conflict. */
  expectedTotal: z.number().int().nonnegative(),
});

export type ShippingDetails = z.output<typeof shippingSchema>;
export type CheckoutValues = z.input<typeof checkoutSchema>;
export type CheckoutInput = z.output<typeof checkoutSchema>;
