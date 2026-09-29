import { NextResponse } from "next/server";

import { readCart } from "@/services/cart/cookie";
import { itemCount } from "@/services/cart/model";

/** Cart badge summary for client components (TanStack Query). No prices. */
export async function GET() {
  const cart = await readCart();
  return NextResponse.json({ count: itemCount(cart) }, { headers: { "Cache-Control": "no-store" } });
}
