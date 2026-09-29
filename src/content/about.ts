import type { ProductImage } from "@/types/product";

/**
 * About page copy. Hero title/subtitle and intro come from PRD §2 and §12.
 * The "meaning" items are DRAFT copy based on the PRD's core brand messages
 * (self-care, self-worth, confidence, feeling beautiful, daily ritual,
 * loved ones) and need CNS Beauty approval.
 */
export const ABOUT_COPY = {
  hero: {
    eyebrow: "Tentang Kami",
    title: "CNS Beauty Skincare",
    subtitle: "Ritual Cantik untuk Diri Sendiri",
    body: "CNS Beauty hadir sebagai bagian dari ritual kecil untuk merawat dan mencintai diri sendiri setiap hari.",
    /** Approved founder or brand photography. Null shows the decorative frame. */
    image: null as ProductImage | null,
  },
  meaning: {
    eyebrow: "Makna Ritual",
    title: "Lebih dari sekadar perawatan kulit",
    items: [
      { id: "self-care", title: "Waktu untuk diri sendiri", description: "Meluangkan waktu sejenak untuk merawat diri di tengah kesibukan." },
      { id: "self-worth", title: "Menghargai diri", description: "Merawat diri adalah cara sederhana untuk menghargai diri sendiri." },
      { id: "confidence", title: "Percaya diri", description: "Rasa percaya diri tumbuh saat kita nyaman dengan diri sendiri." },
      { id: "beautiful", title: "Merasa cantik", description: "Cantik dimulai dari bagaimana kita melihat diri kita sendiri." },
      { id: "ritual", title: "Ritual harian", description: "Langkah-langkah kecil yang dilakukan dengan penuh perhatian, setiap hari." },
      { id: "loved-ones", title: "Bersama orang tersayang", description: "Rasa percaya diri yang ikut kita bawa saat bersama orang-orang terdekat." },
    ],
  },
} as const;
