import { BRAND } from "@/config/site";

// Share-preview (Open Graph / Twitter) metadata. A page that sets its own
// `openGraph` replaces the layout's, so shared defaults are spread in here.

export const SHARE_DEFAULTS = { siteName: BRAND.name, locale: "id_ID" } as const;

/** The branded card from src/app/opengraph-image.tsx. */
export const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${BRAND.name} — ${BRAND.tagline}` } as const;

type ShareImage = { url: string; alt: string; width?: number; height?: number };

/** Product share previews: the first product photo, else the branded card. */
export function productShareMetadata(product: { name: string; description: string; images: readonly { src: string; alt: string }[] }) {
  const first = product.images[0];
  const image: ShareImage = first ? { url: first.src, alt: first.alt } : { ...DEFAULT_SHARE_IMAGE };
  return {
    openGraph: { ...SHARE_DEFAULTS, type: "website" as const, title: product.name, description: product.description, images: [image] },
    twitter: { card: "summary_large_image" as const, images: [image.url] },
  };
}
