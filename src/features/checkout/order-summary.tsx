import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { formatIDR } from "@/lib/utils/format";
import type { CartQuote } from "@/services/cart/quote-schema";

/** Backend quote, presented as-is. */
export function OrderSummary({ quote }: { quote: CartQuote }) {
  return (
    <aside aria-labelledby="order-summary-title" className="h-fit rounded-lg bg-surface p-6 desktop:sticky desktop:top-28">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="order-summary-title" className="text-h4">
          Ringkasan Pesanan
        </h2>
        <Link href={ROUTES.cart} className="text-caption font-medium text-text-primary underline underline-offset-4">
          Ubah
        </Link>
      </div>
      <ul className="mt-4 flex flex-col gap-3 border-b border-border pb-4 text-body-s">
        {quote.lines.map((line) => (
          <li key={`${line.productId}:${line.variantId ?? ""}`} className="flex justify-between gap-4">
            <span className="text-text-primary">
              {line.name}
              {line.variantName && <span className="text-text-secondary"> · {line.variantName}</span>}
              <span className="text-text-secondary"> × {line.quantity}</span>
            </span>
            <span className="shrink-0">{formatIDR(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 flex flex-col gap-2 text-body-s">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Subtotal</dt>
          <dd>{formatIDR(quote.subtotal)}</dd>
        </div>
        {quote.discountTotal > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Diskon{quote.coupon ? ` (${quote.coupon.code})` : ""}</dt>
            <dd>− {formatIDR(quote.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Ongkos kirim</dt>
          <dd>{quote.shippingTotal === 0 ? "Gratis" : formatIDR(quote.shippingTotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-3 text-body font-medium">
          <dt>Total</dt>
          <dd>{formatIDR(quote.total)}</dd>
        </div>
      </dl>
    </aside>
  );
}
