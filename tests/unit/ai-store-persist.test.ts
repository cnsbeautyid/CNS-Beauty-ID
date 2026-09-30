import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_CONVERSATION_STORAGE_KEY,
  createGatedStorage,
  restorePersisted,
  STOPPED_REPLY,
  toPersisted,
} from "@/stores/ai-persistence";
import type { ConciergeMessage } from "@/stores/ai-store";

const ID = "3f2b6c1e-8a4d-4c2e-9b7a-1d2e3f4a5b6c";

function message(index: number, overrides: Partial<ConciergeMessage> = {}): ConciergeMessage {
  return { id: `m${index}`, role: index % 2 ? "assistant" : "user", content: `pesan ${index}`, products: [], state: "done", ...overrides };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function stored(storage: Storage) {
  const raw = storage.getItem(AI_CONVERSATION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: { conversationId: string | null; messages: ConciergeMessage[] }; version: number }) : null;
}

describe("toPersisted", () => {
  it("keeps only the conversation id and the last 20 messages", () => {
    const state = { conversationId: ID, messages: Array.from({ length: 25 }, (_, index) => message(index)), pending: true, statusLabel: "Mencari…" };
    const persisted = toPersisted(state);
    expect(Object.keys(persisted).sort()).toEqual(["conversationId", "messages"]);
    expect(persisted.messages).toHaveLength(20);
    expect(persisted.messages[0]?.id).toBe("m5");
  });
});

describe("toPersisted product cap", () => {
  it("stores at most 24 cards per message, so a restore never fails on size", () => {
    const products = Array.from({ length: 30 }, (_, index) => ({ slug: `produk-${index}`, name: `Produk ${index}`, price: 100000, available: true }));
    const persisted = toPersisted({ conversationId: ID, messages: [message(1, { products })] });
    expect(persisted.messages[0]?.products).toHaveLength(24);
    expect(restorePersisted(persisted)).not.toBeNull();
  });
});

describe("restorePersisted", () => {
  it("restores a valid conversation", () => {
    const value = { conversationId: ID, messages: [message(0), message(1, { handoffUrl: "https://wa.me/62812" })] };
    expect(restorePersisted(value)).toEqual(value);
  });

  it("keeps a reply that gathered many product cards across tool rounds", () => {
    const products = Array.from({ length: 20 }, (_, index) => ({ slug: `produk-${index}`, name: `Produk ${index}`, price: 100000, available: true }));
    const restored = restorePersisted({ conversationId: ID, messages: [message(0), message(1, { products })] });
    expect(restored?.messages[1]?.products).toHaveLength(20);
  });

  it("turns a reply that was still streaming into a stopped one", () => {
    const restored = restorePersisted({
      conversationId: null,
      messages: [message(0), message(1, { content: "", state: "streaming" }), message(3, { content: "Setengah", state: "streaming" })],
    });
    expect(restored?.messages[1]).toMatchObject({ content: STOPPED_REPLY, state: "error" });
    expect(restored?.messages[2]).toMatchObject({ content: "Setengah", state: "error" });
  });

  it.each([
    ["not an object", "hello"],
    ["missing messages", { conversationId: ID }],
    ["non-uuid conversation id", { conversationId: "../admin", messages: [] }],
    ["unsafe handoff url", { conversationId: null, messages: [message(1, { handoffUrl: "javascript:alert(1)" })] }],
    ["unknown role", { conversationId: null, messages: [{ ...message(0), role: "system" }] }],
    ["too many messages", { conversationId: null, messages: Array.from({ length: 21 }, (_, index) => message(index)) }],
  ])("discards %s", (_label, value) => {
    expect(restorePersisted(value)).toBeNull();
  });
});

describe("createGatedStorage", () => {
  it("ignores writes until opened", () => {
    const backing = memoryStorage();
    const gate = createGatedStorage(() => backing);
    gate.storage.setItem("k", "early");
    expect(backing.getItem("k")).toBeNull();
    gate.open();
    gate.storage.setItem("k", "late");
    expect(backing.getItem("k")).toBe("late");
  });

  it("swallows storage that throws", () => {
    const gate = createGatedStorage(() => {
      throw new Error("blocked");
    });
    gate.open();
    expect(gate.storage.getItem("k")).toBeNull();
    expect(() => gate.storage.setItem("k", "v")).not.toThrow();
    expect(() => gate.storage.removeItem("k")).not.toThrow();
  });
});

describe("useAIStore persistence", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    storage = memoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  it("does not overwrite the saved conversation before rehydrating, then restores it", async () => {
    storage.setItem(
      AI_CONVERSATION_STORAGE_KEY,
      JSON.stringify({ state: { conversationId: ID, messages: [message(0), message(1, { content: "", state: "streaming" })] }, version: 1 }),
    );
    const { useAIStore } = await import("@/stores/ai-store");

    // The page sets its context before AIPanel's rehydrate effect runs.
    useAIStore.getState().setPageContext({ pageType: "concierge" });
    expect(stored(storage)?.state.messages).toHaveLength(2);

    await useAIStore.persist.rehydrate();
    const state = useAIStore.getState();
    expect(state.conversationId).toBe(ID);
    expect(state.pageContext).toEqual({ pageType: "concierge" });
    expect(state.messages.at(-1)).toMatchObject({ content: STOPPED_REPLY, state: "error" });
  });

  it("starts empty when the stored value is corrupt", async () => {
    storage.setItem(AI_CONVERSATION_STORAGE_KEY, "{not json");
    const { useAIStore } = await import("@/stores/ai-store");
    await useAIStore.persist.rehydrate();
    expect(useAIStore.getState().messages).toEqual([]);
  });

  it("reset stores an empty conversation, and clearStoredConversation removes the key", async () => {
    storage.setItem(AI_CONVERSATION_STORAGE_KEY, JSON.stringify({ state: { conversationId: ID, messages: [message(0)] }, version: 1 }));
    const { useAIStore, clearStoredConversation } = await import("@/stores/ai-store");
    await useAIStore.persist.rehydrate();

    useAIStore.getState().reset();
    expect(stored(storage)?.state).toEqual({ conversationId: null, messages: [] });

    clearStoredConversation();
    expect(storage.getItem(AI_CONVERSATION_STORAGE_KEY)).toBeNull();
  });
});
