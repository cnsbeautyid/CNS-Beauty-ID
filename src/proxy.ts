import type { NextRequest } from "next/server";

import { assignAnonymousId, setAnonymousIdCookie } from "@/lib/analytics/anonymous-id";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const anonymousId = assignAnonymousId(request);
  const response = await updateSession(request);
  if (anonymousId) setAnonymousIdCookie(response, anonymousId);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets, image optimization and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|brand/|products/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
