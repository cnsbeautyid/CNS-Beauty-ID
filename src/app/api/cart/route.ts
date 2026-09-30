import { NextResponse } from "next/server";

import { CartStoreError, readCart } from "@/services/cart/store";
import { itemCount } from "@/services/cart/model";

/** Cart badge summary for client components (TanStack Query). No prices. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    return NextResponse.json({ count: itemCount(await readCart()) }, { headers });
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    return NextResponse.json({ error: "cart_unavailable" }, { status: 503, headers });
  }
}
