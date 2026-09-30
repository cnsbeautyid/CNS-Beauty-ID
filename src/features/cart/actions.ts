"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUserId } from "@/lib/auth/session";
import { createPublicClient } from "@/lib/supabase/public";
import { trackServerEvent } from "@/services/analytics/record";
import { CartStoreError, readCart, writeCart } from "@/services/cart/store";
import {
  addItem,
  couponCodeSchema,
  itemCount,
  MAX_CART_LINES,
  MAX_QUANTITY,
  removeItem,
  setCoupon,
  setQuantity,
} from "@/services/cart/model";
import { quoteCart } from "@/services/cart/quote";
import { COUPON_ERROR_CODES, quoteErrorMessage } from "@/services/cart/quote-schema";

// Every input is validated here; the client is never trusted with prices,
// stock or identity. Totals always come from quoteCart().

export type CartActionResult = { ok: true; count: number; message?: string } | { ok: false; message: string };

const STORE_FAILED = "Keranjang belum dapat diperbarui. Silakan coba lagi.";

/** Turns a cart storage failure into an honest message instead of a crash. */
async function guarded<T>(run: () => Promise<T>, onStoreError: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    console.error("[cart] storage failed", error.cause);
    return onStoreError;
  }
}

const FAILED: CartActionResult = { ok: false, message: STORE_FAILED };

const lineKeySchema = z.string().regex(/^[0-9a-f-]{36}(:[0-9a-f-]{36})?$/i);

const addSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().optional(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1),
});

export async function addToCartAction(input: unknown): Promise<CartActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  const { productId, variantId, quantity } = parsed.data;

  // Quick, friendly availability check. The quote re-validates everything.
  const db = createPublicClient();
  if (!db) return { ok: false, message: "Keranjang belum tersedia." };
  const { data: product, error } = await db.from("products").select("stock").eq("id", productId).eq("status", "active").maybeSingle();
  if (error) return { ok: false, message: "Produk belum dapat ditambahkan. Silakan coba lagi." };
  if (!product) return { ok: false, message: "Produk ini sudah tidak tersedia." };
  if (!variantId && product.stock <= 0) return { ok: false, message: "Stok habis." };

  return guarded(async (): Promise<CartActionResult> => {
    const change = addItem(await readCart(), productId, variantId, quantity);
    if ("error" in change) return { ok: false, message: `Keranjang maksimal berisi ${MAX_CART_LINES} produk.` };

    await writeCart(change.cart);
    revalidatePath(ROUTES.cart);
    await trackServerEvent("ADD_TO_CART", { productId, properties: { quantity, source: "product" } });
    return { ok: true, count: itemCount(change.cart), message: "Ditambahkan ke keranjang." };
  }, FAILED);
}

const quantitySchema = z.object({ key: lineKeySchema, quantity: z.number().int().min(1).max(MAX_QUANTITY) });

export async function updateQuantityAction(input: unknown): Promise<CartActionResult> {
  const parsed = quantitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Jumlah tidak valid." };
  return guarded(async (): Promise<CartActionResult> => {
    const cart = setQuantity(await readCart(), parsed.data.key, parsed.data.quantity);
    await writeCart(cart);
    revalidatePath(ROUTES.cart);
    return { ok: true, count: itemCount(cart) };
  }, FAILED);
}

export async function removeItemAction(input: unknown): Promise<CartActionResult> {
  const parsed = z.object({ key: lineKeySchema }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  return guarded(async (): Promise<CartActionResult> => {
    const cart = removeItem(await readCart(), parsed.data.key);
    await writeCart(cart);
    revalidatePath(ROUTES.cart);
    await trackServerEvent("REMOVE_FROM_CART", { productId: parsed.data.key.slice(0, 36) });
    return { ok: true, count: itemCount(cart), message: "Produk dihapus dari keranjang." };
  }, FAILED);
}

export type CouponFormState = { status: "idle" | "success" | "error"; message?: string };

/** Stores a coupon only after the backend quote accepts it. */
export async function applyCouponAction(_previous: CouponFormState, formData: FormData): Promise<CouponFormState> {
  const code = couponCodeSchema.safeParse(formData.get("code") ?? "");
  if (!code.success) return { status: "error", message: "Masukkan kode kupon yang valid." };

  return guarded(async (): Promise<CouponFormState> => {
    const cart = await readCart();
    if (cart.items.length === 0) return { status: "error", message: "Keranjangmu masih kosong." };

    const candidate = setCoupon(cart, code.data);
    const result = await quoteCart(candidate, await getSessionUserId());
    if (result.status !== "ok") return { status: "error", message: "Kupon belum dapat diperiksa. Silakan coba lagi nanti." };

    const couponError = result.quote.errors.find((error) => COUPON_ERROR_CODES.has(error.code));
    if (couponError || !result.quote.coupon) {
      return { status: "error", message: couponError ? quoteErrorMessage(couponError) : "Kode kupon tidak valid." };
    }

    await writeCart(candidate);
    revalidatePath(ROUTES.cart);
    await trackServerEvent("VOUCHER_APPLIED", { properties: { discount: result.quote.discountTotal } });
    return { status: "success", message: `Kupon ${result.quote.coupon.code} diterapkan.` };
  }, { status: "error", message: STORE_FAILED });
}

export async function removeCouponAction(): Promise<CartActionResult> {
  return guarded(async (): Promise<CartActionResult> => {
    const cart = setCoupon(await readCart(), undefined);
    await writeCart(cart);
    revalidatePath(ROUTES.cart);
    return { ok: true, count: itemCount(cart), message: "Kupon dihapus." };
  }, FAILED);
}
