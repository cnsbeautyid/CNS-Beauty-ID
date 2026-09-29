import { NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/lib/env/client";

// Liveness/config probe. Reports only whether public config is present —
// never secret values or which secrets are set.
export function GET() {
  return NextResponse.json(
    { status: "ok", supabaseConfigured: getSupabasePublicConfig() !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
