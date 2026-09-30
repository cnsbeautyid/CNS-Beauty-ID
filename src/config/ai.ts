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
