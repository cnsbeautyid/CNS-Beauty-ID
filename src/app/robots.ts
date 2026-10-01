import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env/client";
import { buildRobots } from "@/lib/seo/robots";

// Decided per request from the runtime environment, so a deployment promoted
// or rebuilt with different build-time settings can never ship the wrong rules.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(process.env.VERCEL_ENV === "production", clientEnv.NEXT_PUBLIC_SITE_URL);
}
