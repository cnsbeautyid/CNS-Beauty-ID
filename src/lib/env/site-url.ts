// Build-time guard (called from next.config.ts, so no path aliases here).
// Canonicals, the sitemap and robots are all built from NEXT_PUBLIC_SITE_URL;
// a production build that falls back to localhost would point search engines
// at an unreachable site, so it must fail instead.
export function assertProductionSiteUrl(vercelEnv: string | undefined, siteUrl: string | undefined): void {
  if (vercelEnv !== "production") return;
  const host = siteUrl ? safeHost(siteUrl) : null;
  if (!host || host === "localhost" || host === "127.0.0.1") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be the public site URL (e.g. https://cnsbeauty.id) for production builds.");
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
