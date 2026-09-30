"use client";

import type { ReactNode } from "react";

import { clearStoredConversation } from "@/stores/ai-store";

import { signOutAction } from "./actions";

/**
 * Sign-out that also forgets this tab's concierge conversation, so the next
 * person on a shared browser can't read it. Without JavaScript it is still a
 * plain form POST (and nothing was stored).
 */
export function SignOutForm({ children }: { children: ReactNode }) {
  return (
    <form action={signOutAction} onSubmit={() => clearStoredConversation()}>
      {children}
    </form>
  );
}
