import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/states";
import { productPath } from "@/constants/routes";
import type { ProductCardData } from "@/types/product";

import { Price } from "./price";
import { Rating } from "./rating";

export const PRODUCT_CARD_IMAGE_SIZES =
  "(min-width: 90rem) 20vw, (min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw";

type ProductCardProps = {
  product: ProductCardData;
  /** Add to Cart / Quick View / Ask AI controls, supplied by the feature layer. */
  actions?: ReactNode;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
};

export function ProductCard({ product, actions, headingLevel: Heading = "h3", priority = false }: ProductCardProps) {
  const { slug, name, shortDescription, price, compareAtPrice, rating, badge, image, availability } = product;
  const soldOut = availability === "out_of_stock";

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-brand-ivory">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority={priority}
            sizes={PRODUCT_CARD_IMAGE_SIZES}
            className="object-cover transition-transform duration-(--duration-section) ease-standard desktop:group-hover:scale-103"
          />
        ) : (
          // Decorative placeholder mark (SVG so it is not treated as readable text).
          <svg aria-hidden viewBox="0 0 120 40" className="absolute inset-0 m-auto w-1/3 fill-brand-beige">
            <text x="60" y="30" textAnchor="middle" className="font-display" fontSize="32" letterSpacing="6">
              CNS
            </text>
          </svg>
        )}
        {(badge || soldOut) && (
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
            {badge && <Badge tone="brand">{badge}</Badge>}
            {soldOut && <Badge tone="neutral">Stok habis</Badge>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-1">
        <p className="text-caption tracking-eyebrow text-text-secondary uppercase">CNS Beauty</p>
        <Heading className="text-h4 leading-snug text-text-primary">
          {/* Stretched link: the whole card is clickable, actions stay above it. */}
          <Link
            href={productPath(slug)}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-primary"
          >
            {name}
          </Link>
        </Heading>
        {shortDescription && <p className="line-clamp-2 text-body-s text-text-secondary">{shortDescription}</p>}
        <div className="mt-auto flex flex-col gap-1 pt-2">
          {rating && <Rating average={rating.average} count={rating.count} />}
          <Price price={price} compareAt={compareAtPrice} />
        </div>
      </div>

      {actions && <div className="relative z-10 mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <Skeleton className="aspect-4/5 rounded-lg" />
      <Skeleton className="mt-4 h-3 w-16" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-3 h-4 w-24" />
    </div>
  );
}
