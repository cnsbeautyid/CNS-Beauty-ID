/**
 * Best-effort fixed-window limiter, per server instance. It blunts abuse of
 * paid endpoints (the AI gateway) but is not a global guarantee on
 * serverless; a shared store (e.g. Upstash/Redis) is Phase 21 hardening.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Records a hit; true when the key is still within its limit. */
    hit(key: string, now = Date.now()): boolean {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (hits.size >= maxKeys) {
          for (const [storedKey, stored] of hits) if (stored.resetAt <= now) hits.delete(storedKey);
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        }
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= limit;
    },
  };
}
