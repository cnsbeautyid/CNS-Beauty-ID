import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/env/client", () => ({ getSupabasePublicConfig: () => ({ url: "https://shop.supabase.co", publishableKey: "pk" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: async () => auth.result } }) }));

import { getSessionState, getSessionUser } from "@/lib/auth/session";

describe("getSessionState", () => {
  beforeEach(() => {
    auth.result = { data: null, error: null };
  });

  it("no session is signed out", async () => {
    expect(await getSessionState()).toEqual({ status: "signed-out" });
  });

  it("verified claims are signed in", async () => {
    auth.result = { data: { claims: { sub: "user-sari", email: "sari@example.com" } }, error: null };
    expect(await getSessionState()).toEqual({ status: "signed-in", user: { id: "user-sari", email: "sari@example.com" } });
  });

  it("a failed check is unknown, not signed out", async () => {
    auth.result = { data: null, error: new Error("JWKS fetch failed") };
    expect(await getSessionState()).toEqual({ status: "unknown" });
    // Callers that only need a user still treat it as no user.
    expect(await getSessionUser()).toBeNull();
  });
});
