import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  env: { CRON_SECRET: "s3cret" as string | undefined, SUPABASE_SERVICE_ROLE_KEY: "service" as string | undefined },
  rpc: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({ getServerEnv: () => mocks.env }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));

import { GET } from "@/app/api/cron/analytics-retention/route";

const call = (authorization?: string) =>
  GET(new NextRequest("http://localhost/api/cron/analytics-retention", { headers: authorization ? { authorization } : {} }));

describe("GET /api/cron/analytics-retention", () => {
  beforeEach(() => {
    mocks.env = { CRON_SECRET: "s3cret", SUPABASE_SERVICE_ROLE_KEY: "service" };
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [{ days_rolled_up: 2, rows_upserted: 9, rows_deleted: 40 }], error: null });
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("is unavailable until the cron secret and service role are configured", async () => {
    mocks.env = { CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: "service" };
    expect((await call("Bearer s3cret")).status).toBe(503);
    mocks.env = { CRON_SECRET: "s3cret", SUPABASE_SERVICE_ROLE_KEY: undefined };
    expect((await call("Bearer s3cret")).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a wrong or missing secret without touching data", async () => {
    expect((await call("Bearer wrong!")).status).toBe(401);
    expect((await call()).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rolls up and purges with 180-day retention and reports the counts", async () => {
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ daysRolledUp: 2, rowsUpserted: 9, rowsDeleted: 40 });
    expect(mocks.rpc).toHaveBeenCalledWith("analytics_rollup_and_purge", { p_retention_days: 180 });
  });

  it("fails loudly when the database call fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "failed" });
  });
});
