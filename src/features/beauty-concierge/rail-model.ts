import { AI_QUICK_ACTIONS, CONCIERGE_PERSONAL_PROMPTS } from "@/config/ai";
import type { LoyaltySummary } from "@/services/account/account";
import type { SavedBeautyProfile } from "@/services/quiz/quiz";
import type { AIQuickAction } from "@/types/ai";

// What the /beauty-concierge rail shows, decided from server reads. Pure, so
// every branch is unit-tested (the E2E suite never signs in).

export type RailRoutine = { am: number; pm: number };

export type RailInput = {
  /** "unknown": the session check failed; never shown as signed out. */
  viewer: "signed-in" | "signed-out" | "unknown";
  /** undefined = read failed, null = no profile yet. */
  profile: SavedBeautyProfile | null | undefined;
  routine: RailRoutine | null | undefined;
  loyalty: LoyaltySummary | null;
};

export type RailModel =
  | { kind: "signed-out"; summary: string; prompts: readonly AIQuickAction[] }
  | { kind: "no-profile"; summary: string; prompts: readonly AIQuickAction[]; loyalty: LoyaltySummary | null }
  | {
      kind: "personal";
      summary: string;
      prompts: readonly AIQuickAction[];
      profile: { skinType: string | null; concerns: string[] };
      routine: RailRoutine | null;
      loyalty: LoyaltySummary | null;
    };

const GENERAL_PROMPT_IDS = ["know-my-skin", "find-product", "build-routine"];
const GENERAL_PROMPTS = AI_QUICK_ACTIONS.filter((action) => GENERAL_PROMPT_IDS.includes(action.id));
const ORDER_STATUS = AI_QUICK_ACTIONS.filter((action) => action.id === "order-status");

export function buildRailModel({ viewer, profile, routine, loyalty }: RailInput): RailModel {
  if (viewer === "signed-out") return { kind: "signed-out", summary: "Kenali kulitmu", prompts: GENERAL_PROMPTS };
  // Unknown session: no personal data, and no sign-in prompt for someone who may be signed in.
  if (viewer === "unknown") return { kind: "no-profile", summary: "Kenali kulitmu", prompts: GENERAL_PROMPTS, loyalty: null };
  // A failed profile read looks like "no profile": never offer sign-in to a signed-in customer.
  if (!profile) return { kind: "no-profile", summary: "Kenali kulitmu", prompts: GENERAL_PROMPTS, loyalty };

  const knownRoutine = routine ?? null;
  const hasRoutine = knownRoutine !== null && knownRoutine.am + knownRoutine.pm > 0;
  const summary =
    profile.concerns.length > 0
      ? `Profil kulitmu · ${profile.concerns.length} concern`
      : profile.skinType
        ? `Profil kulitmu · ${profile.skinType}`
        : "Profil kulitmu";

  return {
    kind: "personal",
    summary,
    prompts: [
      hasRoutine ? CONCIERGE_PERSONAL_PROMPTS.consultRoutine : CONCIERGE_PERSONAL_PROMPTS.buildMyRoutine,
      CONCIERGE_PERSONAL_PROMPTS.concernProducts,
      ...ORDER_STATUS,
    ],
    profile: { skinType: profile.skinType, concerns: profile.concerns },
    routine: knownRoutine,
    loyalty,
  };
}
