import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONCIERGE_PAGE_INPUT_ID } from "@/config/ai";

function stubBrowser(pathname: string) {
  const input = { focus: vi.fn() };
  class FakeElement {}
  vi.stubGlobal("HTMLElement", FakeElement);
  vi.stubGlobal("window", { location: { pathname } });
  vi.stubGlobal("document", {
    activeElement: null,
    getElementById: (id: string) => (id === CONCIERGE_PAGE_INPUT_ID ? input : null),
  });
  return input;
}

describe("openAIPanel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("opens the floating panel on ordinary pages", async () => {
    stubBrowser("/produk");
    const { useUIStore } = await import("@/stores/ui-store");
    useUIStore.getState().openAIPanel("Halo");
    expect(useUIStore.getState()).toMatchObject({ aiPanelOpen: true, aiDraft: "Halo" });
  });

  it("on /beauty-concierge keeps one chat surface: pre-fills and focuses the inline chat instead", async () => {
    const input = stubBrowser("/beauty-concierge");
    const { useUIStore } = await import("@/stores/ui-store");
    useUIStore.getState().openAIPanel("Produk untuk kulit kusam?");
    expect(useUIStore.getState()).toMatchObject({ aiPanelOpen: false, aiDraft: "Produk untuk kulit kusam?" });
    expect(input.focus).toHaveBeenCalledOnce();
  });
});
