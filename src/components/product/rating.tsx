import { Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { formatRating } from "@/lib/utils/format";

/** Renders nothing without reviews, so no product shows an invented rating. */
export function Rating({ average, count, className }: { average: number; count: number; className?: string }) {
  if (count <= 0) return null;
  const value = Math.min(5, Math.max(0, average));
  const filled = Math.round(value);

  return (
    <p className={cn("flex items-center gap-1.5 text-caption text-text-secondary", className)}>
      <span className="sr-only">
        Rating {formatRating(value)} dari 5, {count} ulasan
      </span>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn("size-3.5", index < filled ? "fill-brand-gold text-brand-gold" : "text-border")}
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span aria-hidden>
        {formatRating(value)} ({count})
      </span>
    </p>
  );
}
