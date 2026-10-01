import { z } from "zod";

// Server env parsing (full Zod). Browser-side parsing lives in ./public (no Zod,
// it ships to every page) and is re-exported here for existing callers.

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

export { isPrivilegedSupabaseKey, parseClientEnv, type ClientEnv } from "./public";

export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  LLM_API_KEY: optionalString,
  // OpenAI-compatible chat completions gateway (owner decision, Phase 9).
  LLM_BASE_URL: optionalUrl,
  LLM_MODEL: optionalString,
  PAYMENT_SECRET: optionalString,
  WEBHOOK_SECRET: optionalString,
  ADMIN_SECRET: optionalString,
  // Bearer secret Vercel Cron sends to /api/cron/* routes.
  CRON_SECRET: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) throw new Error(`Invalid server environment: ${formatIssues(result.error)}`);
  return result.data;
}
