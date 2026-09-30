"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { getSessionUser } from "@/lib/auth/session";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export type WishlistResult = { ok: true; saved: boolean } | { ok: false; code: "unauthenticated" | "error"; message: string };

/** Saves or removes a product for the signed-in user (RLS: own rows only). */
export async function toggleWishlistAction(productId: string): Promise<WishlistResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, code: "unauthenticated", message: "Masuk untuk menyimpan produk ke wishlist." };
  if (!z.uuid().safeParse(productId).success) return { ok: false, code: "error", message: "Produk tidak ditemukan." };

  const db = await createClient();
  const { data: existing, error } = await db.from("wishlists").select("product_id").eq("product_id", productId).maybeSingle();
  if (error) return { ok: false, code: "error", message: "Wishlist belum dapat diperbarui. Silakan coba lagi." };

  if (existing) {
    const { error: deleteError } = await db.from("wishlists").delete().eq("product_id", productId).eq("user_id", user.id);
    if (deleteError) return { ok: false, code: "error", message: "Wishlist belum dapat diperbarui. Silakan coba lagi." };
    revalidatePath(ROUTES.account.wishlist);
    return { ok: true, saved: false };
  }

  const catalog = createPublicClient();
  const { data: product } = catalog ? await catalog.from("products").select("id").eq("id", productId).eq("status", "active").maybeSingle() : { data: null };
  if (!product) return { ok: false, code: "error", message: "Produk ini sudah tidak tersedia." };

  const { error: insertError } = await db.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (insertError) return { ok: false, code: "error", message: "Wishlist belum dapat diperbarui. Silakan coba lagi." };
  revalidatePath(ROUTES.account.wishlist);
  return { ok: true, saved: true };
}
