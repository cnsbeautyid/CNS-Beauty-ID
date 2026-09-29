import { formatIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Money } from "@/types/product";

/** Presents backend prices. Never derives or calculates an amount. */
export function Price({ price, compareAt, className }: { price: Money; compareAt?: Money; className?: string }) {
  const discounted = compareAt !== undefined && compareAt.amount > price.amount;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="font-medium text-text-primary">
        {discounted && <span className="sr-only">Harga sekarang </span>}
        {formatIDR(price.amount)}
      </span>
      {discounted && (
        <s className="text-body-s text-text-secondary">
          <span className="sr-only">Harga sebelumnya </span>
          {formatIDR(compareAt.amount)}
        </s>
      )}
    </p>
  );
}
