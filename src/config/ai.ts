import type { AIQuickAction } from "@/types/ai";

// Quick actions from master prompt §9.
export const AI_QUICK_ACTIONS: readonly AIQuickAction[] = [
  { id: "know-my-skin", label: "Kenali kulit saya", prompt: "Bantu saya mengenali jenis kulit saya." },
  { id: "find-product", label: "Cari produk", prompt: "Saya sedang mencari produk skincare." },
  { id: "build-routine", label: "Buat skincare routine", prompt: "Buatkan skincare routine untuk saya." },
  { id: "compare", label: "Bandingkan produk", prompt: "Saya ingin membandingkan beberapa produk." },
  { id: "order-status", label: "Cek pesanan saya", prompt: "Saya ingin mengecek status pesanan saya." },
  { id: "dull-skin", label: "Produk untuk kulit kusam", prompt: "Produk apa yang cocok untuk kulit kusam?" },
];

export const AI_COPY = {
  name: "CNS Beauty AI",
  role: "Beauty Concierge",
  greeting:
    "Halo! Aku CNS Beauty AI. Ceritakan kebutuhan kulitmu, dan aku bantu temukan ritual perawatan yang tepat.",
  disclaimer: "Beauty AI memberi saran perawatan, bukan diagnosis medis.",
} as const;

/** Fixed id of the /beauty-concierge input, so rail chips can focus it. */
export const CONCIERGE_PAGE_INPUT_ID = "concierge-page-input";

// Rail prompts on /beauty-concierge. Personal ones only appear for a signed-in
// customer with a skin profile; the concierge reads that profile through its
// own RLS tool, so the prompt carries no personal data.
export const CONCIERGE_PERSONAL_PROMPTS = {
  consultRoutine: { id: "consult-routine", label: "Konsultasikan routine saya", prompt: "Tolong cek skincare routine saya dan beri saran perbaikannya." },
  buildMyRoutine: { id: "build-my-routine", label: "Buat routine dari profil saya", prompt: "Buatkan skincare routine berdasarkan profil kulit saya." },
  concernProducts: { id: "concern-products", label: "Produk untuk concern saya", prompt: "Produk apa yang cocok untuk kebutuhan kulit di profil saya?" },
} as const satisfies Record<string, AIQuickAction>;
