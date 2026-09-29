import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/states";
import type { ProductCardData } from "@/types/product";

import { ProductCard, ProductCardSkeleton } from "./product-card";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-10 tablet:grid-cols-3 desktop:grid-cols-4 desktop:gap-x-6 wide:grid-cols-5";

type ProductGridProps = {
  products: readonly ProductCardData[];
  renderActions?: (product: ProductCardData) => ReactNode;
  empty?: ReactNode;
  /** Number of above-the-fold cards whose images load with priority. */
  priorityCount?: number;
};

export function ProductGrid({ products, renderActions, empty, priorityCount = 0 }: ProductGridProps) {
  if (products.length === 0) {
    return (
      empty ?? (
        <EmptyState title="Belum ada produk" description="Produk untuk pilihan ini belum tersedia. Coba kategori lainnya." />
      )
    );
  }

  return (
    <ul role="list" className={GRID}>
      {products.map((product, index) => (
        <li key={product.slug}>
          <ProductCard product={product} actions={renderActions?.(product)} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Memuat produk">
      <ul role="list" className={GRID}>
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
