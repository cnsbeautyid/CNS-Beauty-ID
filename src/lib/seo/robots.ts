import type { MetadataRoute } from "next";

/** Private or low-value areas; kept out of the index even on production. */
export const ROBOTS_DISALLOW = [
  "/admin",
  "/account",
  "/reseller-portal",
  "/cart",
  "/checkout",
  "/api",
  "/auth",
  "/masuk",
  "/daftar",
  "/design-system",
] as const;

/**
 * Only the real production deployment may be indexed. Preview and local
 * builds block everything so duplicate hosts never compete with the site.
 * Production is detected through Vercel (VERCEL_ENV); if the site ever moves
 * off Vercel, pass the new signal here.
 */
export function buildRobots(isProduction: boolean, siteUrl: string): MetadataRoute.Robots {
  if (!isProduction) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
