import "server-only";

import { parseServerEnv, type ServerEnv } from "./schema";

let cached: ServerEnv | undefined;

/** Server secrets. Parsed lazily so builds do not require every secret. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LLM_API_KEY: process.env.LLM_API_KEY,
    PAYMENT_SECRET: process.env.PAYMENT_SECRET,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
  });
  return cached;
}
