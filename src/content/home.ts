import type { ProductImage } from "@/types/product";

/**
 * Homepage copy. Hero, AI, founder and closing copy come from the master
 * prompt / PRD. The brand-value descriptions are DRAFT copy written as value
 * statements (not product claims) and need CNS Beauty approval before launch.
 */
export const HOME_COPY = {
  hero: {
    eyebrow: "Your Skin. Your Ritual. Your Confidence.",
    titleLines: ["Kulit Sehat,", "Lebih Percaya Diri"],
    body: "Perawatan kulit berkualitas dengan formula terbaik untuk kulit yang lebih bersih, halus, lembut, cerah dan wangi.",
    primaryCta: "Jelajahi Produk",
    secondaryCta: "Tentang Kami",
    aiCta: "Tanya CNS Beauty AI",
    /** Approved hero photography (model + products). Null shows the decorative panel. */
    image: null as ProductImage | null,
  },
  values: {
    eyebrow: "Nilai CNS Beauty",
    title: "Ritual kecil untuk mencintai diri sendiri",
    items: [
      { id: "quality", title: "Kualitas", description: "Komitmen kami di setiap langkah, dari pemilihan produk hingga sampai di tanganmu." },
      { id: "care", title: "Perawatan", description: "Ritual sederhana setiap hari agar kulitmu terasa terawat." },
      { id: "confidence", title: "Kepercayaan Diri", description: "Merasa cantik dan percaya diri, dimulai dari merawat diri." },
      { id: "self-love", title: "Self-Love", description: "Menghargai diri sendiri adalah bentuk cantik yang paling tulus." },
    ],
  },
  concerns: {
    eyebrow: "Belanja sesuai kebutuhan",
    title: "Apa yang ingin kamu rawat?",
    cardCta: "Lihat produk",
  },
  featured: {
    eyebrow: "Pilihan CNS Beauty",
    title: "Produk Unggulan",
    cta: "Lihat semua produk",
  },
  ai: {
    eyebrow: "CNS Beauty AI",
    title: "Temukan Ritual Skincare yang Tepat untukmu",
    body: "Ceritakan kebutuhan kulitmu. Biarkan AI membantu menemukan ritualmu.",
    cta: "Konsultasi dengan Beauty AI",
    promptsLabel: "Mulai dengan",
    quizPrompt: "Lebih suka menjawab beberapa pertanyaan?",
    quizCta: "Ikuti Skin Quiz",
  },
  founder: {
    eyebrow: "Cerita Kami",
    quote:
      "Karena cantik bukan hanya tentang bagaimana orang lain melihat kita. Cantik adalah tentang bagaimana kita melihat dan menghargai diri kita sendiri.",
    name: "Wina Ranesa",
    role: "Founder & Owner CNS Beauty",
    philosophy:
      "Merawat diri bukan sekadar tentang bagaimana kita terlihat, tetapi tentang menghargai diri sendiri, membangun kepercayaan diri, dan menciptakan ritual kecil untuk mencintai diri sendiri setiap hari.",
    cta: "Kenali CNS Beauty",
  },
  testimonials: {
    eyebrow: "Testimoni",
    title: "Cerita dari pelanggan kami",
    verified: "Pembelian terverifikasi",
  },
  journal: {
    eyebrow: "Artikel",
    title: "Edukasi & Ritual Kecantikan",
    cta: "Lihat semua artikel",
  },
  closing: {
    title: "Mulai Ritual Cantikmu Hari Ini",
    body: "Your Skin. Your Ritual. Your Confidence.",
    primaryCta: "Jelajahi Produk",
    // Distinct from the floating launcher's "Tanya Beauty AI" label.
    aiCta: "Tanya CNS Beauty AI",
  },
} as const;
