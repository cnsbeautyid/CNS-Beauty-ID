import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env/client";
import { buildRobots } from "@/lib/seo/robots";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(process.env.VERCEL_ENV === "production", clientEnv.NEXT_PUBLIC_SITE_URL);
}
