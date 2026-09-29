import Image from "next/image";

import type { ProductImage } from "@/types/product";

const PETAL_ANGLES = [0, 72, 144, 216, 288];

/**
 * Arched editorial frame for the hero photograph. Until approved photography
 * exists it shows a decorative botanical line drawing, never stock or
 * AI-generated product imagery.
 */
export function HeroMedia({ image }: { image: ProductImage | null }) {
  return (
    <div className="relative mx-auto aspect-4/5 w-full max-w-md overflow-hidden rounded-t-pill bg-linear-to-b from-brand-blush-soft to-brand-peach desktop:max-w-lg">
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(min-width: 64rem) 32rem, (min-width: 40rem) 28rem, 100vw"
          className="object-cover"
        />
      ) : (
        <svg aria-hidden viewBox="0 0 400 500" className="absolute inset-0 h-full w-full">
          <circle cx="200" cy="215" r="130" className="fill-brand-cream" opacity="0.55" />
          <g className="fill-none stroke-brand-rose-gold" strokeWidth="1.25" strokeLinecap="round" vectorEffect="non-scaling-stroke">
            <path d="M200 480 C 194 400, 214 330, 200 238" />
            <path d="M199 410 C 160 400, 134 370, 128 338 C 164 342, 191 368, 199 410 Z" />
            <path d="M202 360 C 240 352, 266 322, 272 290 C 236 296, 209 320, 202 360 Z" />
            <path d="M198 305 C 166 297, 148 273, 145 250 C 172 255, 192 277, 198 305 Z" />
            {PETAL_ANGLES.map((angle) => (
              <ellipse key={angle} cx="200" cy="176" rx="15" ry="32" transform={`rotate(${angle} 200 206)`} />
            ))}
            <circle cx="200" cy="206" r="9" />
            <path d="M120 150 C 132 140, 146 142, 150 156" />
            <path d="M262 132 C 276 124, 290 130, 290 144" />
          </g>
        </svg>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-t-pill border border-brand-gold" />
    </div>
  );
}
