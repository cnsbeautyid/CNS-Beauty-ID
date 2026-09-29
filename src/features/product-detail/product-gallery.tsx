import Image from "next/image";

import type { ProductImage } from "@/types/product";

/**
 * Swipeable (scroll-snap) on mobile, stacked on desktop. No JavaScript.
 * Without approved photography it shows the brand placeholder.
 */
export function ProductGallery({ images, productName }: { images: readonly ProductImage[]; productName: string }) {
  if (images.length === 0) {
    return (
      <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-brand-ivory">
        <svg aria-hidden viewBox="0 0 120 40" className="absolute inset-0 m-auto w-1/3 fill-brand-beige">
          <text x="60" y="30" textAnchor="middle" className="font-display" fontSize="32" letterSpacing="6">
            CNS
          </text>
        </svg>
        <p className="sr-only">Foto {productName} belum tersedia.</p>
      </div>
    );
  }

  return (
    <div>
      <ul
        aria-label={`Foto ${productName}`}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:px-0 desktop:flex-col desktop:overflow-visible"
      >
        {images.map((image, index) => (
          <li key={image.src} className="relative aspect-4/5 w-10/12 shrink-0 snap-center overflow-hidden rounded-lg bg-brand-ivory tablet:w-full">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              sizes="(min-width: 64rem) 50vw, (min-width: 40rem) 100vw, 85vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
      {images.length > 1 && (
        <p className="mt-2 text-center text-caption text-text-secondary desktop:hidden">Geser untuk melihat {images.length} foto</p>
      )}
    </div>
  );
}
