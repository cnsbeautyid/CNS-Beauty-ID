import "server-only";

import { z } from "zod";

import { orderPath, productPath, ROUTES } from "@/constants/routes";
import { formatDateTime, formatIDR } from "@/lib/utils/format";
import { whatsappUrl } from "@/lib/utils/whatsapp";
import { quoteCart } from "@/services/cart/quote";
import { quoteErrorMessage } from "@/services/cart/quote-schema";
import { readCart } from "@/services/cart/store";
import { getProductBySlug } from "@/services/catalog/product-detail";
import { listProducts } from "@/services/catalog/products";
import { getPublicContact } from "@/services/content/contact";
import { getOwnOrder } from "@/services/order/order";
import { getOwnBeautyProfile, getQuizOptions } from "@/services/quiz/quiz";
import { getLoyaltyProgramme, getOwnLoyaltyAccount, listOwnTransactions } from "@/services/loyalty/loyalty";
import { eventLabel, tierProgress } from "@/services/loyalty/model";
import { getOwnRoutine } from "@/services/routine/routine";
import { orderStatusInfo } from "@/services/order/status";
import type { ProductCardData } from "@/types/product";

import { searchKnowledge } from "./knowledge";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "./knowledge-query";
import type { LLMTool } from "./openai-stream";
import type { AIProductCard } from "./protocol";

/**
 * Controlled tools (CLAUDE.md "AI must use controlled tools"). Read-only;
 * every fact comes from the same services the storefront uses, so prices,
 * stock and claims are exactly what the site shows. Identity comes from the
 * verified session (`userId`), never from the model or the browser.
 */

export type ToolContext = { userId: string | null };
export type ToolOutcome = { content: string; products?: AIProductCard[]; handoffUrl?: string | null; chunkIds?: string[] };

type ToolSpec<T extends z.ZodType> = {
  description: string;
  statusLabel: string;
  parameters: Record<string, unknown>;
  input: T;
  run: (input: z.output<T>, context: ToolContext) => Promise<ToolOutcome>;
};

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const json = (value: unknown) => JSON.stringify(value);

function toCard(product: ProductCardData): AIProductCard {
  return {
    slug: product.slug,
    name: product.name,
    price: product.price.amount,
    compareAtPrice: product.compareAtPrice?.amount,
    available: product.availability !== "out_of_stock",
    imageUrl: product.image?.src,
    shortDescription: product.shortDescription,
  };
}

const searchProducts: ToolSpec<z.ZodType<{ query?: string; concern?: string; skin_type?: string; max_price?: number; limit: number }>> = {
  description:
    "Cari produk CNS Beauty yang aktif di katalog. Kembalikan nama, slug, harga, dan ketersediaan dari database. Gunakan untuk rekomendasi.",
  statusLabel: "Mencari produk yang cocok…",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Kata kunci, mis. 'kulit kusam' atau 'moisturizer'" },
      concern: { type: "string", description: "Slug kebutuhan kulit dari daftar yang tersedia" },
      skin_type: { type: "string", description: "Slug jenis kulit dari daftar yang tersedia" },
      max_price: { type: "integer", description: "Harga maksimal dalam rupiah" },
      limit: { type: "integer", minimum: 1, maximum: 6 },
    },
    additionalProperties: false,
  },
  input: z.object({
    query: z.string().trim().max(100).optional(),
    concern: slug.optional(),
    skin_type: slug.optional(),
    max_price: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(6).default(4),
  }),
  async run(input) {
    const search = (q: string | undefined) =>
      listProducts({ q: q || undefined, kebutuhan: input.concern, kulit: input.skin_type, urut: "featured", halaman: 1 });
    let result = await search(input.query);
    // A narrow keyword can miss; retry with the filters alone before giving up.
    if (result.status === "ok" && result.products.length === 0 && input.query && (input.concern || input.skin_type)) result = await search(undefined);
    if (result.status !== "ok") return { content: json({ error: "Katalog belum dapat diakses saat ini." }) };

    const products = result.products.filter((product) => !input.max_price || product.price.amount <= input.max_price).slice(0, input.limit);
    const cards = products.map(toCard);
    return {
      content: json({
        products: cards.map((card) => ({
          slug: card.slug,
          name: card.name,
          price: formatIDR(card.price),
          available: card.available,
          short_description: card.shortDescription,
          url: productPath(card.slug),
        })),
        note: cards.length === 0 ? "Tidak ada produk yang cocok. Sampaikan dengan jujur dan tawarkan pencarian lain." : undefined,
      }),
      products: cards,
    };
  },
};

const getProduct: ToolSpec<z.ZodType<{ slug: string }>> = {
  description:
    "Ambil detail satu produk: harga, stok, ukuran, cara pakai, kandungan, serta manfaat & FAQ yang sudah disetujui. Satu-satunya sumber klaim produk.",
  statusLabel: "Membaca detail produk…",
  parameters: {
    type: "object",
    properties: { slug: { type: "string", description: "Slug produk" } },
    required: ["slug"],
    additionalProperties: false,
  },
  input: z.object({ slug }),
  async run({ slug: productSlug }) {
    const result = await getProductBySlug(productSlug);
    if (result.status === "not_found") return { content: json({ error: "Produk tidak ditemukan." }) };
    if (result.status === "error") return { content: json({ error: "Detail produk belum dapat diakses saat ini." }) };
    const product = result.product;
    return {
      content: json({
        name: product.name,
        price: formatIDR(product.price.amount),
        compare_at_price: product.compareAtPrice ? formatIDR(product.compareAtPrice.amount) : undefined,
        available: product.availability === "in_stock",
        size: product.size,
        texture: product.texture,
        how_to_use: product.howToUse,
        routine_time: product.routineTime,
        bpom_number: product.bpomNumber,
        key_ingredients: product.ingredients.filter((ingredient) => ingredient.isKey).map((ingredient) => ({ name: ingredient.name, benefit: ingredient.benefit })),
        concerns: product.concerns.map((concern) => concern.name),
        skin_types: product.skinTypes.map((type) => type.name),
        // Only approved copy reaches the storefront (claim governance, Phase 5).
        approved_description: product.copy.description,
        approved_benefits: product.copy.benefits,
        approved_faqs: product.copy.faqs,
        url: productPath(product.slug),
      }),
      products: [
        {
          slug: product.slug,
          name: product.name,
          price: product.price.amount,
          compareAtPrice: product.compareAtPrice?.amount,
          available: product.availability === "in_stock",
          imageUrl: product.images[0]?.src,
          shortDescription: product.shortDescription,
        },
      ],
    };
  },
};

const getCart: ToolSpec<z.ZodType<Record<string, never>>> = {
  description: "Lihat isi keranjang pelanggan saat ini beserta total dari sistem (harga, diskon, ongkir). Jangan hitung total sendiri.",
  statusLabel: "Memeriksa keranjang…",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  input: z.object({}).strict(),
  async run(_input, context) {
    let cart;
    try {
      cart = await readCart();
    } catch {
      return { content: json({ error: "Keranjang belum dapat dibaca saat ini." }) };
    }
    if (cart.items.length === 0) return { content: json({ empty: true }) };
    const result = await quoteCart(cart, context.userId);
    if (result.status !== "ok") return { content: json({ item_count: cart.items.length, error: "Total belanja belum dapat dihitung saat ini." }) };
    const { quote } = result;
    return {
      content: json({
        lines: quote.lines.map((line) => ({ name: line.name, quantity: line.quantity, line_total: formatIDR(line.lineTotal) })),
        subtotal: formatIDR(quote.subtotal),
        discount: quote.discountTotal > 0 ? formatIDR(quote.discountTotal) : undefined,
        shipping: quote.shippingTotal === 0 ? "Gratis" : formatIDR(quote.shippingTotal),
        total: formatIDR(quote.total),
        problems: quote.errors.map(quoteErrorMessage),
      }),
    };
  },
};

const getOrderStatus: ToolSpec<z.ZodType<{ order_number: string }>> = {
  description: "Cek status pesanan milik pelanggan yang sedang masuk akun, berdasarkan nomor pesanan (mis. CNS-260930-00001).",
  statusLabel: "Mengecek pesanan…",
  parameters: {
    type: "object",
    properties: { order_number: { type: "string" } },
    required: ["order_number"],
    additionalProperties: false,
  },
  input: z.object({ order_number: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,40}$/) }),
  async run({ order_number: orderNumber }, context) {
    if (!context.userId) return { content: json({ requires_login: true, message: "Pelanggan perlu masuk akun untuk melihat pesanan." }) };
    // RLS: another customer's order number is simply not found.
    const result = await getOwnOrder(orderNumber, context.userId);
    if (result.status === "not_found") return { content: json({ error: "Pesanan tidak ditemukan di akun ini." }) };
    if (result.status === "error") return { content: json({ error: "Status pesanan belum dapat diakses saat ini." }) };
    const { order } = result;
    return {
      content: json({
        order_number: order.orderNumber,
        status: orderStatusInfo(order.status).label,
        created_at: formatDateTime(order.createdAt),
        total: formatIDR(order.total),
        tracking_number: order.shipping.trackingNumber ?? undefined,
        courier: order.shipping.courier ?? undefined,
        url: orderPath(order.orderNumber),
      }),
    };
  },
};

const requestHumanHelp: ToolSpec<z.ZodType<{ reason: string }>> = {
  description: "Hubungkan pelanggan dengan tim CNS Beauty (WhatsApp) saat diminta, ada keluhan, atau kamu tidak bisa membantu.",
  statusLabel: "Menghubungkan ke tim CNS Beauty…",
  parameters: {
    type: "object",
    properties: { reason: { type: "string", description: "Ringkasan singkat kebutuhan pelanggan" } },
    required: ["reason"],
    additionalProperties: false,
  },
  input: z.object({ reason: z.string().trim().min(1).max(300) }),
  async run({ reason }) {
    const contact = await getPublicContact();
    const url = contact?.whatsapp ? whatsappUrl(contact.whatsapp, `Halo CNS Beauty, saya butuh bantuan: ${reason}`) : null;
    return { content: json({ handoff_available: Boolean(url) }), handoffUrl: url };
  },
};

const searchKnowledgeTool: ToolSpec<z.ZodType<{ query: string; category?: KnowledgeCategory }>> = {
  description:
    "Cari pengetahuan resmi CNS Beauty yang sudah disetujui: tentang brand, pengiriman, kebijakan, batasan AI, serta penjelasan produk dan bahan. Gunakan kata kunci singkat.",
  statusLabel: "Mencari informasi resmi CNS Beauty…",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Kata kunci, mis. 'ongkir pengiriman' atau 'cara pakai lotion'" },
      category: { type: "string", enum: [...KNOWLEDGE_CATEGORIES] },
    },
    required: ["query"],
    additionalProperties: false,
  },
  input: z.object({ query: z.string().trim().min(2).max(200), category: z.enum(KNOWLEDGE_CATEGORIES).optional() }),
  async run({ query, category }) {
    const result = await searchKnowledge(query, { category });
    if (result.status !== "ok") return { content: json({ error: "Pengetahuan CNS Beauty belum dapat diakses saat ini." }) };
    if (result.sources.length === 0) {
      return { content: json({ sources: [], note: "Tidak ada informasi resmi yang cocok. Jangan menebak; katakan belum tahu dan tawarkan bantuan tim." }) };
    }
    return {
      // Reference material, not instructions (it is still owner-approved text).
      content: json({ sources: result.sources.map((source) => ({ title: source.title, category: source.category, content: source.content })) }),
      chunkIds: result.sources.map((source) => source.chunkId),
    };
  },
};

const getMyProfileAndRoutine: ToolSpec<z.ZodType<Record<string, never>>> = {
  description:
    "Ambil profil kulit (dari Skin Quiz) dan rutinitas tersimpan milik pelanggan yang sedang masuk akun, untuk saran yang personal. Bukan data medis.",
  statusLabel: "Membaca profil kulit & rutinitasmu…",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  input: z.object({}).strict(),
  async run(_input, context) {
    if (!context.userId) return { content: json({ requires_login: true, message: "Pelanggan perlu masuk akun agar profil dan rutinitasnya bisa dibaca." }) };
    // RLS: the signed-in customer's own rows only.
    const [profile, routine] = await Promise.all([getQuizOptions().then(getOwnBeautyProfile), getOwnRoutine()]);
    const describe = (items: NonNullable<Awaited<ReturnType<typeof getOwnRoutine>>>["view"]["am"]) =>
      items.map((item) => ({ step: item.step?.name, product: item.product?.card.name ?? (item.unavailable ? "produk tidak lagi tersedia" : "produk milik pelanggan") }));
    return {
      content: json({
        skin_profile: profile
          ? { skin_type: profile.skinType ?? "belum yakin", concerns: profile.concerns, sensitivity: profile.sensitivity, current_routine: profile.routine }
          : profile === null
            ? "Belum ada profil. Sarankan Skin Quiz."
            : "Profil belum dapat dibaca.",
        routine: routine ? { morning: describe(routine.view.am), evening: describe(routine.view.pm) } : routine === null ? "Belum ada rutinitas tersimpan." : "Rutinitas belum dapat dibaca.",
      }),
    };
  },
};

const getMyLoyalty: ToolSpec<z.ZodType<Record<string, never>>> = {
  description: "Lihat saldo poin CNS Rewards, tingkat, dan aktivitas poin terakhir milik pelanggan yang sedang masuk akun. Jangan menebak saldo.",
  statusLabel: "Memeriksa poin CNS Rewards…",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  input: z.object({}).strict(),
  async run(_input, context) {
    if (!context.userId) return { content: json({ requires_login: true, message: "Pelanggan perlu masuk akun untuk melihat poin." }) };
    // RLS: the signed-in customer's own ledger only.
    const [account, programme, history] = await Promise.all([getOwnLoyaltyAccount(), getLoyaltyProgramme(), listOwnTransactions()]);
    if (!account || !programme) return { content: json({ error: "Poin belum dapat dibaca saat ini." }) };
    const progress = tierProgress(account.lifetimePoints, programme.tiers);
    return {
      content: json({
        balance: account.balance,
        tier: progress.current?.name,
        points_to_next_tier: progress.next ? { tier: progress.next.name, remaining: progress.remaining } : undefined,
        point_value: programme.settings.pointValue > 0 ? formatIDR(programme.settings.pointValue) : undefined,
        max_redeem_percent_at_checkout: programme.settings.maxRedeemPercent,
        recent_activity: (history?.items ?? []).slice(0, 5).map((entry) => ({ type: eventLabel(entry.event), points: entry.points, date: formatDateTime(entry.createdAt) })),
        url: ROUTES.account.loyalty,
      }),
    };
  },
};

const SPECS = {
  search_products: searchProducts,
  get_product: getProduct,
  get_cart: getCart,
  get_order_status: getOrderStatus,
  request_human_help: requestHumanHelp,
  search_knowledge: searchKnowledgeTool,
  get_my_profile_and_routine: getMyProfileAndRoutine,
  get_my_loyalty: getMyLoyalty,
} as const satisfies Record<string, ToolSpec<z.ZodType>>;

export type ToolName = keyof typeof SPECS;

export type ToolRegistry = {
  definitions: LLMTool[];
  statusLabel(name: string): string;
  run(name: string, rawArguments: string, context: ToolContext): Promise<ToolOutcome>;
};

export const CONCIERGE_TOOLS: ToolRegistry = {
  definitions: Object.entries(SPECS).map(([name, spec]) => ({
    type: "function",
    function: { name, description: spec.description, parameters: spec.parameters },
  })),
  statusLabel: (name) => (name in SPECS ? SPECS[name as ToolName].statusLabel : "Memproses…"),
  async run(name, rawArguments, context) {
    if (!(name in SPECS)) return { content: json({ error: `Tool tidak dikenal: ${name}` }) };
    const spec = SPECS[name as ToolName] as ToolSpec<z.ZodType>;
    let args: unknown;
    try {
      args = rawArguments.trim() ? JSON.parse(rawArguments) : {};
    } catch {
      return { content: json({ error: "INVALID_JSON: argumen tool tidak valid." }) };
    }
    const parsed = spec.input.safeParse(args);
    if (!parsed.success) return { content: json({ error: "Argumen tool tidak valid.", issues: parsed.error.issues.map((issue) => issue.message) }) };
    try {
      return await spec.run(parsed.data, context);
    } catch (error) {
      console.error(`[ai] tool ${name} failed`, error);
      return { content: json({ error: "Data belum dapat diakses saat ini." }) };
    }
  },
};
