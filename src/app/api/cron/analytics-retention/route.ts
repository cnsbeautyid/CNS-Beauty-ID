import { NextResponse, type NextRequest } from "next/server";

import { ANALYTICS_RETENTION_DAYS } from "@/constants/analytics";
import { authorized } from "@/lib/auth/cron";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (01:30 WIB): rolls raw analytics events up into anonymous daily
 * totals, then deletes whole raw days older than the retention period
 * (public.analytics_rollup_and_purge). A missed night is caught up next run.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!env.CRON_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), env.CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await createAdminClient().rpc("analytics_rollup_and_purge", { p_retention_days: ANALYTICS_RETENTION_DAYS });
  if (error) {
    console.error("[analytics-retention] failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  const row = data?.[0];
  const counts = { daysRolledUp: row?.days_rolled_up ?? 0, rowsUpserted: row?.rows_upserted ?? 0, rowsDeleted: row?.rows_deleted ?? 0 };
  console.info("[analytics-retention]", counts);
  return NextResponse.json(counts);
}
