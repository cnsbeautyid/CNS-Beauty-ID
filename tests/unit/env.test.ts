import { describe, expect, it } from "vitest";

import { isPrivilegedSupabaseKey, parseClientEnv, parseServerEnv } from "@/lib/env/schema";

const jwtWithRole = (role: string) => {
  const payload = Buffer.from(JSON.stringify({ role, iss: "supabase" })).toString("base64url");
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
};

describe("isPrivilegedSupabaseKey", () => {
  it("flags new-format secret keys", () => {
    expect(isPrivilegedSupabaseKey("sb_secret_abc123")).toBe(true);
  });

  it("flags legacy service_role JWTs", () => {
    expect(isPrivilegedSupabaseKey(jwtWithRole("service_role"))).toBe(true);
  });

  it("allows publishable and legacy anon keys", () => {
    expect(isPrivilegedSupabaseKey("sb_publishable_abc123")).toBe(false);
    expect(isPrivilegedSupabaseKey(jwtWithRole("anon"))).toBe(false);
  });

  it("does not throw on malformed keys", () => {
    expect(isPrivilegedSupabaseKey("not.a-jwt.value")).toBe(false);
  });
});

describe("parseClientEnv", () => {
  it("defaults the site URL and treats blank values as unset", () => {
    const env = parseClientEnv({
      NEXT_PUBLIC_SITE_URL: "",
      NEXT_PUBLIC_SUPABASE_URL: "  ",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
  });

  it("accepts a valid public config", () => {
    const env = parseClientEnv({
      NEXT_PUBLIC_SITE_URL: "https://cnsbeauty.example",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc123",
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://project.supabase.co");
  });

  it("rejects a secret key placed in the public variable", () => {
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_leaked" }),
    ).toThrow(/secret\/service-role key/);
  });

  it("rejects an invalid Supabase URL", () => {
    expect(() => parseClientEnv({ NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});

describe("parseServerEnv", () => {
  it("allows secrets to be absent during foundation phases", () => {
    expect(parseServerEnv({})).toEqual({
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      LLM_API_KEY: undefined,
      PAYMENT_SECRET: undefined,
      WEBHOOK_SECRET: undefined,
      ADMIN_SECRET: undefined,
    });
  });
});
