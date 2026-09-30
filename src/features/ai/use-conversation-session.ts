"use client";

import { useEffect } from "react";

import { getSupabasePublicConfig } from "@/lib/env/client";
import { scheduleAfterLoadIdle } from "@/lib/utils/idle";
import { rehydrateConversationOnce, useAIStore } from "@/stores/ai-store";

/**
 * Restores this tab's conversation once, then keeps it tied to whoever is
 * signed in: when the session ends (sign-out anywhere, expiry) or a different
 * customer signs in, the stored conversation is cleared. The browser session
 * is only used to forget local data, never for authorization.
 *
 * The Supabase client is imported only after load and idle, so it is never
 * part of a page's first load. Same-tab sign-out still clears the conversation
 * immediately (SignOutForm).
 */
export function useConversationSession(): void {
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let cancelSchedule: (() => void) | undefined;
    void Promise.resolve(rehydrateConversationOnce()).then(() => {
      if (!active || !getSupabasePublicConfig()) return;
      cancelSchedule = scheduleAfterLoadIdle(() => {
        void import("@/lib/supabase/client").then(({ createClient }) => {
          if (!active) return;
          const { data } = createClient().auth.onAuthStateChange((_event, session) => {
            useAIStore.getState().syncOwner(session?.user.id ?? null);
          });
          unsubscribe = () => data.subscription.unsubscribe();
        });
      });
    });
    return () => {
      active = false;
      cancelSchedule?.();
      unsubscribe?.();
    };
  }, []);
}
