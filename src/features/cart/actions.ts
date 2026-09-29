"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUserId } from "@/lib/auth/session";
import { createPublicClient } from "@/lib/supabase/public";
import { readCart, writeCart } from "@/services/cart/cookie";
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

  const change = addItem(await readCart(), productId, variantId, quantity);
  if ("error" in change) return { ok: false, message: `Keranjang maksimal berisi ${MAX_CART_LINES} produk.` };

  await writeCart(change.cart);
  revalidatePath(ROUTES.cart);
  return { ok: true, count: itemCount(change.cart), message: "Ditambahkan ke keranjang." };
}

const quantitySchema = z.object({ key: lineKeySchema, quantity: z.number().int().min(1).max(MAX_QUANTITY) });

export async function updateQuantityAction(input: unknown): Promise<CartActionResult> {
  const parsed = quantitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Jumlah tidak valid." };
  const cart = setQuantity(await readCart(), parsed.data.key, parsed.data.quantity);
  await writeCart(cart);
  revalidatePath(ROUTES.cart);
  return { ok: true, count: itemCount(cart) };
}

export async function removeItemAction(input: unknown): Promise<CartActionResult> {
  const parsed = z.object({ key: lineKeySchema }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Permintaan tidak valid." };
  const cart = removeItem(await readCart(), parsed.data.key);
  await writeCart(cart);
  revalidatePath(ROUTES.cart);
  return { ok: true, count: itemCount(cart), message: "Produk dihapus dari keranjang." };
}

export type CouponFormState = { status: "idle" | "success" | "error"; message?: string };

/** Stores a coupon only after the backend quote accepts it. */
export async function applyCouponAction(_previous: CouponFormState, formData: FormData): Promise<CouponFormState> {
  const code = couponCodeSchema.safeParse(formData.get("code") ?? "");
  if (!code.success) return { status: "error", message: "Masukkan kode kupon yang valid." };

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
  return { status: "success", message: `Kupon ${result.quote.coupon.code} diterapkan.` };
}

export async function removeCouponAction(): Promise<CartActionResult> {
  const cart = setCoupon(await readCart(), undefined);
  await writeCart(cart);
  revalidatePath(ROUTES.cart);
  return { ok: true, count: itemCount(cart), message: "Kupon dihapus." };
}
