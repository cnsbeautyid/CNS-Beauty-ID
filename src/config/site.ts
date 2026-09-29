import { ROUTES } from "@/constants/routes";

export type NavItem = { label: string; href: string };

export type Announcement = {
  id: string;
  message: string;
  href?: string;
  /** ISO 8601, e.g. "2026-10-01T00:00:00+07:00". */
  startsAt?: string;
  endsAt?: string;
};

export const BRAND = {
  name: "CNS Beauty",
  legalName: "CNS Beauty Skincare",
  founderLine: "by Wina Ranesa",
  tagline: "Your Skin. Your Ritual. Your Confidence.",
} as const;

// Header order follows master prompt §5.
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Beranda", href: ROUTES.home },
  { label: "Produk", href: ROUTES.products },
  { label: "Tentang Kami", href: ROUTES.about },
  { label: "Manfaat", href: ROUTES.benefits },
  { label: "Testimoni", href: ROUTES.testimonials },
  { label: "Artikel", href: ROUTES.journal },
  { label: "Kontak", href: ROUTES.contact },
];

export const FOOTER_NAV: readonly { title: string; items: readonly NavItem[] }[] = [
  {
    title: "Belanja",
    items: [
      { label: "Semua Produk", href: ROUTES.products },
      { label: "Paket Perawatan", href: ROUTES.bundles },
      { label: "Skin Quiz", href: ROUTES.skinQuiz },
      { label: "Beauty Concierge", href: ROUTES.beautyConcierge },
    ],
  },
  {
    title: "CNS Beauty",
    items: [
      { label: "Tentang Kami", href: ROUTES.about },
      { label: "Manfaat", href: ROUTES.benefits },
      { label: "Testimoni", href: ROUTES.testimonials },
      { label: "Artikel", href: ROUTES.journal },
    ],
  },
  {
    title: "Bantuan",
    items: [
      { label: "FAQ", href: ROUTES.faq },
      { label: "Kontak", href: ROUTES.contact },
      { label: "Jadi Reseller", href: ROUTES.resellerProgram },
    ],
  },
];

/**
 * Announcement bar content. Intentionally empty: campaigns must come from
 * approved configuration (later the `campaigns` table), not be hard-coded.
 */
export const ANNOUNCEMENTS: readonly Announcement[] = [];

/** Official social profiles. Empty until CNS Beauty provides verified URLs. */
export const SOCIAL_LINKS: readonly NavItem[] = [];
