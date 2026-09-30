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

describe("shared AI modules", () => {
  it("use zod/mini, not the full Zod bundle", () => {
    for (const file of ["src/services/ai/protocol.ts", "src/stores/ai-persistence.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/from "zod\/mini"/);
      expect(source).not.toMatch(/from "zod";/);
    }
  });
});

describe("catalog client components", () => {
  it("take their option lists from the Zod-free options module", () => {
    const source = readFileSync("src/features/catalog/sort-select.tsx", "utf8");
    expect(source).not.toMatch(/^import \{[^}]*\bSORT_OPTIONS\b[^}]*\} from "@\/services\/catalog\/query"/m);
    expect(readFileSync("src/services/catalog/options.ts", "utf8")).not.toMatch(/from "zod/);
  });
});

describe("public env URL whitespace", () => {
  it("trims pasted whitespace from URLs, as the former Zod schema did", () => {
    const env = fromPublic({ NEXT_PUBLIC_SITE_URL: "https://cnsbeauty.id\n", NEXT_PUBLIC_SUPABASE_URL: " https://x.supabase.co\t" });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://cnsbeauty.id");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://x.supabase.co");
  });
});
