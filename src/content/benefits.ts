/**
 * Benefits page copy. The journey follows PRD §13 (concern → desired result →
 * product → routine). Routine steps follow the order in CNS Beauty's own
 * "Glow Routine" material (serum → moisturizer → face mist) and describe
 * product CATEGORIES only. Product-level benefits appear only from approved
 * product_claims (Phase 4/5), never from this file.
 */
export const BENEFITS_COPY = {
  hero: {
    eyebrow: "Manfaat",
    title: "Dari kebutuhan kulit ke ritual yang tepat",
    body: "Setiap kulit punya kebutuhan yang berbeda. Kenali kebutuhanmu, lalu temukan produk dan ritual yang sesuai untukmu.",
  },
  journey: {
    eyebrow: "Cara kerjanya",
    title: "Menemukan ritualmu dalam empat langkah",
    steps: [
      { id: "concern", title: "Kenali kebutuhan kulit", description: "Mulai dari hal yang ingin kamu rawat, misalnya kulit yang terasa kusam atau kering." },
      { id: "result", title: "Tentukan hasil yang diharapkan", description: "Pikirkan bagaimana kamu ingin kulitmu terasa dalam ritual harianmu." },
      { id: "product", title: "Pilih produk yang sesuai", description: "Lihat manfaat, kandungan dan cara pakai di setiap halaman produk." },
      { id: "routine", title: "Jalani ritualnya", description: "Gunakan secara rutin sesuai petunjuk pemakaian." },
    ],
  },
  routine: {
    eyebrow: "Glow Routine",
    title: "Ritual tiga langkah",
    steps: [
      { id: "serum", label: "Langkah 1", title: "Serum", description: "Tahap perawatan bertekstur ringan, digunakan setelah wajah dibersihkan." },
      { id: "moisturizer", label: "Langkah 2", title: "Moisturizer", description: "Pelembap yang diaplikasikan setelah serum sebagai bagian dari ritual harian." },
      { id: "face-mist", label: "Langkah 3", title: "Face Mist", description: "Semprotan wajah untuk melengkapi ritual, bisa digunakan kapan saja kamu mau." },
    ],
    cta: "Lihat semua produk",
  },
  cta: {
    title: "Belum yakin harus mulai dari mana?",
    body: "Ceritakan kebutuhan kulitmu kepada CNS Beauty AI, atau ikuti Skin Quiz singkat.",
    aiCta: "Tanya CNS Beauty AI",
    quizCta: "Ikuti Skin Quiz",
  },
  disclaimer:
    "Informasi di halaman ini bersifat umum, bukan diagnosis atau saran medis. Pengalaman setiap orang dapat berbeda. Hentikan pemakaian jika terjadi iritasi.",
} as const;
