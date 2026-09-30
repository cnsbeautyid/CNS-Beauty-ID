import { describe, expect, it } from "vitest";

import { buildRailModel } from "@/features/beauty-concierge/rail-model";
import type { SavedBeautyProfile } from "@/services/quiz/quiz";

const profile: SavedBeautyProfile = {
  skinType: "Kering",
  concerns: ["Kusam", "Sensitif"],
  sensitivity: null,
  routine: [],
  budget: null,
  updatedAt: "2026-09-30T00:00:00Z",
};
const loyalty = { balance: 1250, lifetimePoints: 3000, tierName: "Glow" };
const ids = (model: ReturnType<typeof buildRailModel>) => model.prompts.map((prompt) => prompt.id);

describe("buildRailModel", () => {
  it("signed out: invites the Skin Quiz and sign-in, general prompts only", () => {
    const model = buildRailModel({ viewer: "signed-out", profile: null, routine: null, loyalty: null });
    expect(model.kind).toBe("signed-out");
    expect(model.summary).toBe("Kenali kulitmu");
    expect(ids(model)).toEqual(["know-my-skin", "find-product", "build-routine"]);
  });

  it("signed in without a profile: Skin Quiz, keeps points", () => {
    const model = buildRailModel({ viewer: "signed-in", profile: null, routine: null, loyalty });
    expect(model).toMatchObject({ kind: "no-profile", summary: "Kenali kulitmu", loyalty });
  });

  it("signed in but the profile read failed: no-profile view, never the sign-in view", () => {
    const model = buildRailModel({ viewer: "signed-in", profile: undefined, routine: undefined, loyalty: null });
    expect(model.kind).toBe("no-profile");
  });

  it("session could not be read: no personal data and never the sign-in view", () => {
    const model = buildRailModel({ viewer: "unknown", profile: null, routine: null, loyalty: null });
    expect(model).toMatchObject({ kind: "no-profile", loyalty: null });
  });

  it("personal: summarises concerns and offers routine consultation", () => {
    const model = buildRailModel({ viewer: "signed-in", profile, routine: { am: 3, pm: 4 }, loyalty });
    expect(model).toMatchObject({
      kind: "personal",
      summary: "Profil kulitmu · 2 concern",
      profile: { skinType: "Kering", concerns: ["Kusam", "Sensitif"] },
      routine: { am: 3, pm: 4 },
      loyalty,
    });
    expect(ids(model)).toEqual(["consult-routine", "concern-products", "order-status"]);
  });

  it("personal without a routine offers to build one; failed reads hide their rows", () => {
    const model = buildRailModel({ viewer: "signed-in", profile, routine: undefined, loyalty: null });
    expect(model).toMatchObject({ kind: "personal", routine: null, loyalty: null });
    expect(ids(model)[0]).toBe("build-my-routine");
    expect(buildRailModel({ viewer: "signed-in", profile, routine: { am: 0, pm: 0 }, loyalty }).prompts[0]?.id).toBe("build-my-routine");
  });

  it("personal summary falls back to skin type, then to a plain label", () => {
    expect(buildRailModel({ viewer: "signed-in", profile: { ...profile, concerns: [] }, routine: null, loyalty: null }).summary).toBe(
      "Profil kulitmu · Kering",
    );
    expect(buildRailModel({ viewer: "signed-in", profile: { ...profile, concerns: [], skinType: null }, routine: null, loyalty: null }).summary).toBe(
      "Profil kulitmu",
    );
  });
});
