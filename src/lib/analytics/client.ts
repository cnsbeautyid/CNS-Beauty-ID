import type { ClientEventName } from "@/constants/analytics";

// Browser side of the event contract. Fire-and-forget: never throws, never
// blocks navigation. Identity is added by the server (session + first-party
// cookie); the browser only adds a per-tab session id and campaign tags.

const ENDPOINT = "/api/analytics";
const SESSION_KEY = "cns_sid";
const UTM_KEY = "cns_utm";

type TrackOptions = {
  properties?: Record<string, string | number | undefined>;
  productId?: string;
  aiConversationId?: string | null;
};

/** Do Not Track or Global Privacy Control. */
export function isTrackingDisabled(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Campaign tags from the landing URL, remembered for the tab session. */
function campaign(): Record<string, string> | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = { source: params.get("utm_source"), medium: params.get("utm_medium"), campaign: params.get("utm_campaign") };
    if (fromUrl.source || fromUrl.medium || fromUrl.campaign) {
      const clean = Object.fromEntries(Object.entries(fromUrl).filter((entry): entry is [string, string] => Boolean(entry[1])));
      sessionStorage.setItem(UTM_KEY, JSON.stringify(clean));
      return clean;
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : undefined;
  } catch {
    return undefined;
  }
}

let referrerSent = false;

export function track(name: ClientEventName, options: TrackOptions = {}): void {
  try {
    if (typeof window === "undefined" || isTrackingDisabled() || /^\/admin(\/|$)/.test(window.location.pathname)) return;
    const properties = Object.fromEntries(Object.entries(options.properties ?? {}).filter(([, value]) => value !== undefined));
    const body = JSON.stringify({
      name,
      properties,
      productId: options.productId,
      aiConversationId: options.aiConversationId ?? undefined,
      path: window.location.pathname,
      referrer: referrerSent ? undefined : document.referrer || undefined,
      sessionId: sessionId(),
      utm: campaign(),
    });
    referrerSent = true;
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
    void fetch(ENDPOINT, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true, credentials: "same-origin" }).catch(() => {});
  } catch {
    // Analytics must never break the page.
  }
}
