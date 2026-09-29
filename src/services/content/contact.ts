import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createPublicClient } from "@/lib/supabase/public";

const contactSchema = z.object({
  whatsapp: z.string().regex(/^62\d{8,13}$/).optional().catch(undefined),
  whatsapp_display: z.string().max(40).optional().catch(undefined),
  instagram: z.string().max(60).optional().catch(undefined),
  email: z.email().optional().catch(undefined),
  city: z.string().max(80).optional().catch(undefined),
  region: z.string().max(80).optional().catch(undefined),
});

export type PublicContact = z.infer<typeof contactSchema>;

/** Business contact from the public `settings.contact` row. Null if unavailable. */
export const getPublicContact = cache(async (): Promise<PublicContact | null> => {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db.from("settings").select("value").eq("key", "contact").eq("is_public", true).maybeSingle();
  if (error) {
    console.error("[content] getPublicContact failed", error);
    return null;
  }
  const parsed = contactSchema.safeParse(data?.value ?? {});
  return parsed.success ? parsed.data : null;
});
