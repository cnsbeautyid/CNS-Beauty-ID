"use client";

import { useEffect, useRef } from "react";

import type { ClientEventName } from "@/constants/analytics";
import { track } from "@/lib/analytics/client";

type TrackEventProps = {
  name: ClientEventName;
  properties?: Record<string, string | number | undefined>;
  productId?: string;
};

/** Fires one client event when a server-rendered page mounts (once per mount). */
export function TrackEvent({ name, properties, productId }: TrackEventProps) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(name, { properties, productId });
  }, [name, properties, productId]);
  return null;
}
