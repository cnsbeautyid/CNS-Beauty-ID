import type { NextConfig } from "next";

import { assertProductionSiteUrl } from "./src/lib/env/site-url";

assertProductionSiteUrl(process.env.VERCEL_ENV, process.env.NEXT_PUBLIC_SITE_URL);

// Baseline security headers. A full Content-Security-Policy is deferred to
// Phase 21 (Production Hardening), once the payment provider and AI streaming
// origins are known.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

// Product and content images are served from this project's public Storage.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePattern = supabaseUrl ? [new URL("/storage/v1/object/public/**", supabaseUrl)] : [];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: storagePattern,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
