import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseClientEnv as fromPublic } from "@/lib/env/public";
import { parseClientEnv as fromSchema } from "@/lib/env/schema";

describe("public env parsing", () => {
  it("ships no Zod to the browser", () => {
    for (const file of ["src/lib/env/public.ts", "src/lib/env/client.ts"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/from "zod|from "\.\/schema"/);
    }
  });

  it("is the same function the server-side schema module exposes", () => {
    expect(fromSchema).toBe(fromPublic);
  });

  it("reports every invalid field in one message, as before", () => {
    expect(() => fromPublic({ NEXT_PUBLIC_SITE_URL: "nope", NEXT_PUBLIC_SUPABASE_URL: "also nope" })).toThrow(
      /^Invalid public environment: NEXT_PUBLIC_SITE_URL: .+; NEXT_PUBLIC_SUPABASE_URL: .+/,
    );
  });
});
