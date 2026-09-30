/**
 * Partner programme page copy. DRAFT for CNS Beauty approval. It only states
 * how the programme works in the system (tiered partner pricing, same checkout,
 * back-office approval). Partner prices and minimums are shown to approved
 * partners inside the portal, never publicly, and no earnings are promised.
 */
export const RESELLER_COPY = {
  hero: {
    eyebrow: "Program Partner",
    title: "Jadi Partner CNS Beauty",
    description:
      "Bergabung sebagai reseller atau dropshipper dan bagikan ritual perawatan CNS Beauty kepada pelangganmu dengan harga partner khusus.",
  },
  steps: [
    { id: "apply", title: "Daftar", description: "Isi formulir pendaftaran dengan akun CNS Beauty-mu." },
    { id: "review", title: "Ditinjau tim kami", description: "Tim CNS Beauty meninjau pendaftaran dan mengonfirmasi jenis serta level kemitraanmu." },
    { id: "order", title: "Belanja dengan harga partner", description: "Setelah disetujui, harga partner otomatis berlaku saat kamu berbelanja dan portal partner terbuka." },
  ],
  types: [
    {
      id: "reseller",
      title: "Reseller",
      description:
        "Beli stok dengan harga partner sesuai level, lalu jual kembali kepada pelangganmu. Level yang lebih tinggi memiliki minimal pembelian dan harga partner yang berbeda.",
    },
    {
      id: "dropshipper",
      title: "Dropshipper",
      description: "Pesanan untuk pembelimu diproses dengan harga dropship, mulai dari satu produk.",
    },
  ],
  notes: [
    "Daftar harga partner dan minimal pembelian setiap level tersedia di portal partner setelah pendaftaran disetujui.",
    "Harga partner tidak dapat digabung dengan voucher atau poin CNS Rewards.",
  ],
} as const;
