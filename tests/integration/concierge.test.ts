import { beforeEach, describe, expect, it, vi } from "vitest";

// Concierge loop with a scripted fake LLM, and the controlled tools with the
// catalog/order/cart services mocked. No network, no real model.

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  listProducts: vi.fn(),
  getProductBySlug: vi.fn(),
  getOwnOrder: vi.fn(),
  readCart: vi.fn(),
  quoteCart: vi.fn(),
  getPublicContact: vi.fn(),
  searchKnowledge: vi.fn(),
  getOwnBeautyProfile: vi.fn(),
  getOwnRoutine: vi.fn(),
}));
vi.mock("@/services/catalog/products", () => ({ listProducts: mocks.listProducts }));
vi.mock("@/services/catalog/product-detail", () => ({ getProductBySlug: mocks.getProductBySlug }));
vi.mock("@/services/order/order", () => ({ getOwnOrder: mocks.getOwnOrder }));
vi.mock("@/services/cart/store", () => ({ readCart: mocks.readCart }));
vi.mock("@/services/cart/quote", () => ({ quoteCart: mocks.quoteCart }));
vi.mock("@/services/content/contact", () => ({ getPublicContact: mocks.getPublicContact }));
vi.mock("@/services/ai/knowledge", () => ({ searchKnowledge: mocks.searchKnowledge }));
vi.mock("@/services/quiz/quiz", () => ({ getQuizOptions: async () => null, getOwnBeautyProfile: mocks.getOwnBeautyProfile }));
vi.mock("@/services/routine/routine", () => ({ getOwnRoutine: mocks.getOwnRoutine }));
vi.mock("@/services/loyalty/loyalty", () => ({
  getOwnLoyaltyAccount: async () => ({ balance: 2500, lifetimePoints: 2500, tierId: null }),
  getLoyaltyProgramme: async () => ({ tiers: [{ id: "g", slug: "glow", name: "Glow", minLifetimePoints: 0, benefits: [] }], rules: [], rewards: [], settings: { pointValue: 1, maxRedeemPercent: 50 } }),
  listOwnTransactions: async () => ({ items: [{ id: "t", event: "purchase", points: 2500, description: null, createdAt: "2026-09-30T07:05:00Z" }], hasMore: false }),
}));

const { runConcierge, MAX_TOOL_ROUNDS } = await import("@/services/ai/concierge");
const { CONCIERGE_TOOLS } = await import("@/services/ai/tools");
type LLMStreamEvent = import("@/services/ai/openai-stream").LLMStreamEvent;
type LLMMessage = import("@/services/ai/openai-stream").LLMMessage;

const product = (slug: string, amount: number, availability: "in_stock" | "out_of_stock" = "in_stock") => ({
  slug,
  name: `Produk ${slug}`,
  price: { amount, currency: "IDR" },
  availability,
});

function scriptedLLM(rounds: LLMStreamEvent[][]) {
  const calls: LLMMessage[][] = [];
  return {
    calls,
    async *stream({ messages }: { messages: LLMMessage[] }) {
      calls.push(structuredClone(messages));
      for (const event of rounds[calls.length - 1] ?? [{ type: "end", toolCalls: [], finishReason: "stop" }]) yield event;
    },
  };
}

async function collect(generator: AsyncGenerator<unknown, unknown>) {
  const events: unknown[] = [];
  let step = await generator.next();
  while (!step.done) {
    events.push(step.value);
    step = await generator.next();
  }
  return { events, result: step.value };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listProducts.mockResolvedValue({ status: "ok", products: [product("serum", 150000), product("toner", 90000, "out_of_stock")], total: 2, page: 1, pageCount: 1 });
  mocks.getPublicContact.mockResolvedValue({ whatsapp: "6281285356499" });
});

describe("runConcierge", () => {
  const base = { tools: CONCIERGE_TOOLS, hints: { concerns: [], skinTypes: [] }, context: { userId: null } };

  it("runs a tool, streams cards from tool data, then the answer", async () => {
    const llm = scriptedLLM([
      [{ type: "end", toolCalls: [{ id: "c1", name: "search_products", arguments: '{"query":"kusam","max_price":100000}' }], finishReason: "tool_calls" }],
      [
        { type: "text", delta: "Coba Toner ini." },
        { type: "end", toolCalls: [], finishReason: "stop", usage: { input: 50, output: 8 } },
      ],
    ]);
    const { events, result } = await collect(
      runConcierge({ ...base, llm, history: [{ role: "user", content: "Produk untuk kulit kusam?" }], pageContext: { pageType: "product", productSlug: "serum" } }),
    );

    expect(events).toEqual([
      { type: "status", label: "Mencari produk yang cocok…" },
      { type: "products", items: [{ slug: "toner", name: "Produk toner", price: 90000, compareAtPrice: undefined, available: false, imageUrl: undefined, shortDescription: undefined }] },
      { type: "text", delta: "Coba Toner ini." },
    ]);
    expect(result).toEqual({ text: "Coba Toner ini.", usage: { input: 50, output: 8 }, escalationReason: undefined, retrievedChunkIds: [] });

    // The model saw the system prompt, the page hint, the tool call and a DB-sourced tool result.
    const second = llm.calls[1] ?? [];
    expect(second[0]).toMatchObject({ role: "system" });
    expect(second[1]).toMatchObject({ role: "system", content: expect.stringContaining("slug: serum") });
    expect(second.at(-2)).toMatchObject({ role: "assistant", tool_calls: [{ id: "c1", function: { name: "search_products" } }] });
    expect(JSON.parse((second.at(-1) as { content: string }).content)).toMatchObject({ products: [{ slug: "toner", price: "Rp 90.000", available: false }] });
  });

  it("offers the human team and records why", async () => {
    const llm = scriptedLLM([
      [{ type: "end", toolCalls: [{ id: "h", name: "request_human_help", arguments: '{"reason":"Kulit perih setelah pemakaian"}' }], finishReason: "tool_calls" }],
      [{ type: "text", delta: "Tim kami siap membantu." }, { type: "end", toolCalls: [], finishReason: "stop" }],
    ]);
    const { events, result } = await collect(runConcierge({ ...base, llm, history: [{ role: "user", content: "Saya mau komplain" }], pageContext: undefined }));
    expect(events).toContainEqual({ type: "handoff", url: expect.stringContaining("https://wa.me/6281285356499?text=") });
    expect(result).toMatchObject({ escalationReason: "Kulit perih setelah pemakaian" });
  });

  it("stops after a bounded number of tool rounds", async () => {
    const loop: LLMStreamEvent[] = [{ type: "end", toolCalls: [{ id: "x", name: "get_cart", arguments: "{}" }], finishReason: "tool_calls" }];
    mocks.readCart.mockResolvedValue({ v: 1, items: [] });
    const llm = scriptedLLM(Array.from({ length: 10 }, () => loop));
    const { result } = await collect(runConcierge({ ...base, llm, history: [{ role: "user", content: "?" }], pageContext: undefined }));
    expect(llm.calls).toHaveLength(MAX_TOOL_ROUNDS);
    expect((result as { text: string }).text).toContain("Tim CNS Beauty siap membantu");
  });
});

describe("controlled tools", () => {
  const guest = { userId: null };

  it("rejects malformed, invalid and unknown calls without throwing", async () => {
    expect(JSON.parse((await CONCIERGE_TOOLS.run("search_products", '{"query":', guest)).content).error).toMatch(/INVALID_JSON/);
    expect(JSON.parse((await CONCIERGE_TOOLS.run("get_product", '{"slug":"../../etc"}', guest)).content).error).toMatch(/tidak valid/);
    expect(JSON.parse((await CONCIERGE_TOOLS.run("delete_orders", "{}", guest)).content).error).toMatch(/tidak dikenal/);
  });

  it("never looks up orders for guests, and uses the session user otherwise", async () => {
    expect(JSON.parse((await CONCIERGE_TOOLS.run("get_order_status", '{"order_number":"cns-260930-00001"}', guest)).content)).toMatchObject({ requires_login: true });
    expect(mocks.getOwnOrder).not.toHaveBeenCalled();

    mocks.getOwnOrder.mockResolvedValue({ status: "not_found" });
    await CONCIERGE_TOOLS.run("get_order_status", '{"order_number":"cns-260930-00001"}', { userId: "user-1" });
    expect(mocks.getOwnOrder).toHaveBeenCalledWith("CNS-260930-00001", "user-1");
  });

  it("reports cart totals from the backend quote only", async () => {
    mocks.readCart.mockResolvedValue({ v: 1, items: [{ p: "p", q: 1 }] });
    mocks.quoteCart.mockResolvedValue({
      status: "ok",
      quote: { lines: [{ name: "Serum", quantity: 1, lineTotal: 150000 }], subtotal: 150000, discountTotal: 0, shippingTotal: 20000, total: 170000, errors: [] },
    });
    expect(JSON.parse((await CONCIERGE_TOOLS.run("get_cart", "{}", guest)).content)).toMatchObject({ total: "Rp 170.000", shipping: "Rp 20.000" });
    mocks.quoteCart.mockResolvedValue({ status: "unavailable" });
    expect(JSON.parse((await CONCIERGE_TOOLS.run("get_cart", "{}", guest)).content)).toMatchObject({ error: expect.stringContaining("belum dapat dihitung") });
  });

  it("returns only approved product copy", async () => {
    mocks.getProductBySlug.mockResolvedValue({
      status: "ok",
      product: {
        slug: "serum",
        name: "Serum",
        price: { amount: 150000, currency: "IDR" },
        availability: "in_stock",
        images: [],
        ingredients: [{ name: "Niacinamide", isKey: true, benefit: "Membantu mencerahkan" }],
        concerns: [],
        skinTypes: [],
        copy: { benefits: [], faqs: [] },
      },
    });
    const outcome = await CONCIERGE_TOOLS.run("get_product", '{"slug":"serum"}', guest);
    expect(JSON.parse(outcome.content)).toMatchObject({ approved_benefits: [], approved_faqs: [], key_ingredients: [{ name: "Niacinamide" }] });
    expect(outcome.products?.[0]).toMatchObject({ slug: "serum", price: 150000, available: true });
  });
});

describe("knowledge retrieval", () => {
  const base = { tools: CONCIERGE_TOOLS, hints: { concerns: [], skinTypes: [] }, context: { userId: null } };

  it("answers from approved sources and records which chunks were used", async () => {
    mocks.searchKnowledge.mockResolvedValue({
      status: "ok",
      sources: [{ chunkId: "chunk-1", title: "Pengiriman", category: "shipping", content: "Pesanan dikirim dalam 1-3 hari kerja." }],
    });
    const llm = scriptedLLM([
      [{ type: "end", toolCalls: [{ id: "k", name: "search_knowledge", arguments: '{"query":"pengiriman","category":"shipping"}' }], finishReason: "tool_calls" }],
      [{ type: "text", delta: "Pesanan dikirim dalam 1-3 hari kerja." }, { type: "end", toolCalls: [], finishReason: "stop" }],
    ]);
    const { events, result } = await collect(runConcierge({ ...base, llm, history: [{ role: "user", content: "Berapa lama pengiriman?" }], pageContext: undefined }));

    expect(mocks.searchKnowledge).toHaveBeenCalledWith("pengiriman", { category: "shipping" });
    expect(events).toContainEqual({ type: "status", label: "Mencari informasi resmi CNS Beauty…" });
    expect(result).toMatchObject({ retrievedChunkIds: ["chunk-1"] });
    const toolMessage = llm.calls[1]?.at(-1) as { content: string };
    expect(JSON.parse(toolMessage.content)).toEqual({ sources: [{ title: "Pengiriman", category: "shipping", content: "Pesanan dikirim dalam 1-3 hari kerja." }] });
  });

  it("tells the model not to guess when nothing approved matches, and fails safe", async () => {
    mocks.searchKnowledge.mockResolvedValue({ status: "ok", sources: [] });
    const empty = await CONCIERGE_TOOLS.run("search_knowledge", '{"query":"aman untuk ibu hamil"}', { userId: null });
    expect(JSON.parse(empty.content)).toMatchObject({ sources: [], note: expect.stringContaining("Jangan menebak") });
    expect(empty.chunkIds).toBeUndefined();

    mocks.searchKnowledge.mockResolvedValue({ status: "unavailable" });
    expect(JSON.parse((await CONCIERGE_TOOLS.run("search_knowledge", '{"query":"brand"}', { userId: null })).content)).toMatchObject({ error: expect.any(String) });
    expect(JSON.parse((await CONCIERGE_TOOLS.run("search_knowledge", '{"query":"x","category":"secrets"}', { userId: null })).content).error).toMatch(/tidak valid/);
  });
});

describe("get_my_profile_and_routine", () => {
  it("is only available to signed-in customers", async () => {
    const outcome = await CONCIERGE_TOOLS.run("get_my_profile_and_routine", "{}", { userId: null });
    expect(JSON.parse(outcome.content)).toMatchObject({ requires_login: true });
    expect(mocks.getOwnRoutine).not.toHaveBeenCalled();
  });

  it("summarizes the customer's own profile and routine", async () => {
    mocks.getOwnBeautyProfile.mockResolvedValue({ skinType: "Kering", concerns: ["Kulit Kusam"], sensitivity: "Kadang sensitif", routine: ["Cleanse"] });
    mocks.getOwnRoutine.mockResolvedValue({
      view: {
        am: [{ step: { name: "Moisturize" }, product: { card: { name: "Licorice Moisturizer" } }, unavailable: false }],
        pm: [{ step: { name: "Cleanse" }, product: null, unavailable: false }],
      },
    });
    const outcome = await CONCIERGE_TOOLS.run("get_my_profile_and_routine", "{}", { userId: "user-1" });
    expect(JSON.parse(outcome.content)).toEqual({
      skin_profile: { skin_type: "Kering", concerns: ["Kulit Kusam"], sensitivity: "Kadang sensitif", current_routine: ["Cleanse"] },
      routine: { morning: [{ step: "Moisturize", product: "Licorice Moisturizer" }], evening: [{ step: "Cleanse", product: "produk milik pelanggan" }] },
    });
  });
});

describe("get_my_loyalty", () => {
  it("never reveals points to guests and reads the ledger for customers", async () => {
    expect(JSON.parse((await CONCIERGE_TOOLS.run("get_my_loyalty", "{}", { userId: null })).content)).toMatchObject({ requires_login: true });
    const outcome = JSON.parse((await CONCIERGE_TOOLS.run("get_my_loyalty", "{}", { userId: "user-1" })).content);
    expect(outcome).toMatchObject({ balance: 2500, tier: "Glow", max_redeem_percent_at_checkout: 50, recent_activity: [{ type: "Belanja", points: 2500 }] });
  });
});
