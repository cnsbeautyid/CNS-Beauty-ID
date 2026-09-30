"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { productPath } from "@/constants/routes";
import { track } from "@/lib/analytics/client";
import { formatIDR } from "@/lib/utils/format";
import type { AIProductCard } from "@/services/ai/protocol";

/** Recommendation cards. Every value comes from catalog tool data, never from model text. */
export function AIProductCards({
  products,
  conversationId,
  onNavigate,
  layout = "scroll",
}: {
  products: AIProductCard[];
  conversationId?: string | null;
  onNavigate?: () => void;
  layout?: "scroll" | "grid";
}) {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current || products.length === 0) return;
    viewed.current = true;
    track("AI_RECOMMENDATION_VIEWED", { properties: { count: products.length }, aiConversationId: conversationId });
  }, [products.length, conversationId]);

  const accept = (slug: string) => {
    track("AI_RECOMMENDATION_ACCEPTED", { properties: { slug }, aiConversationId: conversationId });
    onNavigate?.();
  };

  return (
    <ul
      aria-label="Rekomendasi produk"
      className={layout === "grid" ? "grid grid-cols-2 gap-3" : "-mx-1 flex gap-3 overflow-x-auto px-1 pb-1"}
    >
      {products.map((product) => (
        <li key={product.slug} className={layout === "grid" ? "min-w-0" : "w-44 shrink-0"}>
          <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background">
            <div className="relative aspect-[4/3] bg-brand-ivory">
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  sizes={layout === "grid" ? "(min-width: 64rem) 20rem, 45vw" : "176px"}
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <h3 className="font-display text-body leading-snug">
                <Link href={productPath(product.slug)} onClick={() => accept(product.slug)} className="after:absolute after:inset-0 hover:underline">
                  {product.name}
                </Link>
              </h3>
              <p className="text-body-s font-medium">
                {formatIDR(product.price)}
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="ml-2 text-caption text-text-secondary line-through">{formatIDR(product.compareAtPrice)}</span>
                )}
              </p>
              {!product.available && <p className="text-caption text-text-secondary">Stok habis</p>}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
