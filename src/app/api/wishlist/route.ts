import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { listWishlistIds } from "@/services/account/account";

/** Saved product ids for the wishlist hearts (empty for guests). No-store. */
export async function GET() {
  const user = await getSessionUser();
  const productIds = user ? await listWishlistIds() : [];
  return NextResponse.json({ signedIn: Boolean(user), productIds }, { headers: { "Cache-Control": "private, no-store" } });
}
