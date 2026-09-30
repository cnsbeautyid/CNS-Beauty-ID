import { z } from "zod";

// Pure env parsing, shared by client.ts and server.ts and unit-testable
// without Next.js runtime conditions.

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

/**
 * A browser-exposed key must never carry elevated privileges. Rejects the new
 * `sb_secret_` keys and legacy JWT keys whose role is `service_role`.
 */
export function isPrivilegedSupabaseKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;

  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    // atob works in both the browser and Node; this module ships to both.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded: unknown = JSON.parse(atob(base64));
    return (
      typeof decoded === "object" &&
      decoded !== null &&
      "role" in decoded &&
      decoded.role === "service_role"
    );
  } catch {
    return false;
  }
}

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString.refine(
    (key) => key === undefined || !isPrivilegedSupabaseKey(key),
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret/service-role key. Use the publishable key.",
  ),
});

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

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(source);
  if (!result.success) throw new Error(`Invalid public environment: ${formatIssues(result.error)}`);
  return result.data;
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) throw new Error(`Invalid server environment: ${formatIssues(result.error)}`);
  return result.data;
}
