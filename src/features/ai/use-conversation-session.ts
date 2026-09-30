"use client";

import { useEffect } from "react";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { createClient } from "@/lib/supabase/client";
import { rehydrateConversationOnce, useAIStore } from "@/stores/ai-store";

/**
 * Restores this tab's conversation once, then keeps it tied to whoever is
 * signed in: when the session ends (sign-out anywhere, expiry) or a different
 * customer signs in, the stored conversation is cleared. The browser session
 * is only used to forget local data, never for authorization.
 */
export function useConversationSession(): void {
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void Promise.resolve(rehydrateConversationOnce()).then(() => {
      if (!active || !getSupabasePublicConfig()) return;
      const { data } = createClient().auth.onAuthStateChange((_event, session) => {
        useAIStore.getState().syncOwner(session?.user.id ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
}
