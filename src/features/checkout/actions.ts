"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { orderPath, ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { formatIDR } from "@/lib/utils/format";
import { CartStoreError, readCart, writeCart } from "@/services/cart/store";
import { EMPTY_CART } from "@/services/cart/model";
import { quoteCart } from "@/services/cart/quote";
import { quoteErrorMessage, type QuoteError } from "@/services/cart/quote-schema";
import { getCheckoutPrefill, saveAddress } from "@/services/checkout/addresses";
import { getPaymentSettings } from "@/services/checkout/payment";
import { placeOrder } from "@/services/checkout/place-order";
import { checkoutSchema, type CheckoutValues } from "@/services/checkout/schema";

/** PRD §21 failure states, plus auth/validation. */
export type CheckoutFailure =
  | "unauthenticated"
  | "invalid"
  | "empty"
  | "checkout_conflict"
  | "inventory_unavailable"
  | "rejected"
  | "unavailable"
  | "error";

export type CheckoutActionResult = { ok: false; code: CheckoutFailure; message: string };

const fail = (code: CheckoutFailure, message: string): CheckoutActionResult => ({ ok: false, code, message });

const describe = (errors: QuoteError[]) => [...new Set(errors.map(quoteErrorMessage))].join(" ");

/**
 * Places the order for the signed-in user. Identity comes only from the
 * verified session; the browser sends the address and the total it saw, never
 * prices. Redirects to the order page on success.
 */
export async function placeOrderAction(values: CheckoutValues): Promise<CheckoutActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("unauthenticated", "Sesi berakhir. Silakan masuk kembali untuk melanjutkan.");
  if (!user.email) return fail("error", "Akunmu belum memiliki email. Hubungi tim kami melalui WhatsApp.");

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return fail("invalid", "Periksa kembali data pengiriman.");
  const input = parsed.data;

  let cart;
  try {
    cart = await readCart();
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    return fail("error", "Keranjang belum dapat dimuat. Silakan coba lagi.");
  }
  if (cart.items.length === 0) return fail("empty", "Keranjangmu kosong.");

  const quoted = await quoteCart(cart, user.id);
  if (quoted.status === "unavailable") return fail("unavailable", "Checkout belum dapat diproses saat ini. Silakan pesan melalui WhatsApp.");
  if (quoted.status !== "ok") return fail("error", "Total belanja belum dapat dihitung. Silakan coba lagi.");
  if (quoted.quote.errors.length > 0) return fail("rejected", describe(quoted.quote.errors));
  if (quoted.quote.total !== input.expectedTotal) {
    return fail("checkout_conflict", `Total belanja berubah menjadi ${formatIDR(quoted.quote.total)}. Periksa ringkasan lalu buat pesanan lagi.`);
  }

  const [payment, prefill] = await Promise.all([getPaymentSettings(), getCheckoutPrefill()]);
  const result = await placeOrder({
    cart,
    userId: user.id,
    customer: { name: prefill.fullName ?? input.shipping.recipientName, email: user.email, phone: input.shipping.phone },
    shipping: input.shipping,
    notes: input.notes,
    expiryHours: payment.expiryHours,
  });

  switch (result.status) {
    case "inventory":
      return fail("inventory_unavailable", "Stok salah satu produk baru saja habis. Periksa keranjangmu.");
    case "rejected":
      return fail("rejected", describe(result.errors));
    case "unavailable":
      return fail("unavailable", "Checkout belum dapat diproses saat ini. Silakan pesan melalui WhatsApp.");
    case "error":
      return fail("error", "Pesanan belum dapat dibuat. Silakan coba lagi.");
    case "ok":
      break;
  }

  // The order exists now; failing to clear the cart must not hide that.
  await writeCart(EMPTY_CART).catch((error: unknown) => console.error("[checkout] clearing the cart failed", error));
  if (input.saveAddress) await saveAddress(user.id, input.shipping, prefill.addresses);
  revalidatePath(ROUTES.cart);
  redirect(orderPath(result.orderNumber));
}
