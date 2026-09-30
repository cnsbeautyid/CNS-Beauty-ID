import { CircleAlert, MessageCircle, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Container } from "@/components/layout/container";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { productPath, ROUTES } from "@/constants/routes";
import { formatIDR } from "@/lib/utils/format";
import { whatsappUrl } from "@/lib/utils/whatsapp";
import type { ProductSummary } from "@/services/catalog/products";
import { lineKey, type CartState } from "@/services/cart/model";
import type { CartQuoteResult } from "@/services/cart/quote";
import { COUPON_ERROR_CODES, quoteErrorMessage, type CartQuote } from "@/services/cart/quote-schema";

import { AppliedCoupon, CouponForm } from "./coupon-form";
import { QuantityControl, RemoveLineButton } from "./line-controls";

type CartViewProps = {
  cart: CartState;
  result: CartQuoteResult;
  products: Map<string, ProductSummary>;
  whatsapp?: string;
};

/** Every amount shown here comes from the backend quote; nothing is computed. */
export function CartView({ cart, result, products, whatsapp }: CartViewProps) {
  if (result.status === "error") {
    return (
      <Shell>
        <ErrorState
          description="Keranjang belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.cart} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </Shell>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Shell>
        <EmptyState
          icon={<ShoppingBag className="size-8" strokeWidth={1.25} />}
          title="Keranjangmu masih kosong"
          description="Temukan produk yang sesuai dengan kebutuhan kulitmu."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href={ROUTES.products}>Jelajahi Produk</ButtonLink>
              <AskAIButton>Tanya CNS Beauty AI</AskAIButton>
            </div>
          }
        />
      </Shell>
    );
  }

  const quote = result.status === "ok" ? result.quote : null;
  const hasLineErrors = quote?.errors.some((error) => !COUPON_ERROR_CODES.has(error.code)) ?? false;

  return (
    <Shell count={cart.items.length}>
      <div className="grid gap-10 desktop:grid-cols-3">
        <ul aria-label="Produk di keranjang" className="divide-y divide-border border-y border-border desktop:col-span-2">
          {cart.items.map((item) => {
            const key = lineKey(item);
            const product = products.get(item.p);
            const line = quote?.lines.find((l) => l.productId === item.p && (l.variantId ?? undefined) === item.v);
            const error = quote?.errors.find((e) => e.product_id === item.p);
            const name = line?.name ?? product?.name ?? "Produk tidak tersedia";
            return (
              <li key={key} className="flex gap-4 py-5">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-brand-ivory tablet:size-24">
                  {product?.image && <Image src={product.image.src} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {product ? (
                        <Link href={productPath(product.slug)} className="font-display text-h4 leading-snug hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <p className="font-display text-h4 leading-snug text-text-secondary">{name}</p>
                      )}
                      {line?.variantName && <p className="text-caption text-text-secondary">{line.variantName}</p>}
                      {line && <p className="mt-1 text-body-s text-text-secondary">{formatIDR(line.unitPrice)} / pcs</p>}
                    </div>
                    <RemoveLineButton lineKey={key} productName={name} />
                  </div>
                  {error && (
                    <p role="alert" className="flex items-center gap-1.5 text-body-s text-error">
                      <CircleAlert aria-hidden className="size-4 shrink-0" />
                      {quoteErrorMessage(error)}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <QuantityControl lineKey={key} quantity={item.q} productName={name} />
                    {line && <p className="font-medium">{formatIDR(line.lineTotal)}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-labelledby="summary-title" className="h-fit rounded-lg bg-surface p-6 desktop:sticky desktop:top-28">
          <h2 id="summary-title" className="text-h4">
            Ringkasan Belanja
          </h2>
          {quote ? (
            <Summary quote={quote} cart={cart} hasLineErrors={hasLineErrors} whatsapp={whatsapp} />
          ) : (
            <p role="status" className="mt-4 text-body-s text-text-secondary">
              Total belanja belum dapat dihitung saat ini. Produk di keranjangmu tetap tersimpan.
            </p>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Summary({ quote, cart, hasLineErrors, whatsapp }: { quote: CartQuote; cart: CartState; hasLineErrors: boolean; whatsapp?: string }) {
  const couponError = quote.errors.find((error) => COUPON_ERROR_CODES.has(error.code));
  const rows = [
    { label: "Subtotal", value: formatIDR(quote.subtotal) },
    ...(quote.discountTotal > 0 ? [{ label: `Diskon${quote.coupon ? ` (${quote.coupon.code})` : ""}`, value: `− ${formatIDR(quote.discountTotal)}` }] : []),
    { label: "Ongkos kirim", value: quote.subtotal > 0 && quote.shippingTotal === 0 ? "Gratis" : formatIDR(quote.shippingTotal) },
  ];
  const orderMessage = [
    "Halo CNS Beauty, saya ingin memesan:",
    ...quote.lines.map((line) => `- ${line.name} × ${line.quantity}`),
    `Total: ${formatIDR(quote.total)}`,
  ].join("\n");

  return (
    <div className="mt-4 flex flex-col gap-5">
      <dl className="flex flex-col gap-2 text-body-s">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-text-secondary">{row.label}</dt>
            <dd className="text-text-primary">{row.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-border pt-3 text-body font-medium">
          <dt>Total</dt>
          <dd>{formatIDR(quote.total)}</dd>
        </div>
      </dl>

      {quote.shippingTotal > 0 && quote.freeShippingThreshold > 0 && (
        <p className="text-caption text-text-secondary">Gratis ongkir untuk belanja minimal {formatIDR(quote.freeShippingThreshold)}.</p>
      )}

      {quote.coupon ? (
        <AppliedCoupon code={quote.coupon.code} description={quote.coupon.description} />
      ) : (
        <>
          {cart.coupon && couponError && (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-caption text-error">
                Kupon {cart.coupon}: {quoteErrorMessage(couponError)}
              </p>
              <AppliedCoupon code={cart.coupon} description={null} />
            </div>
          )}
          {!cart.coupon && <CouponForm />}
        </>
      )}

      <div className="flex flex-col gap-2">
        {hasLineErrors ? (
          <>
            <Button size="lg" fullWidth disabled aria-describedby="checkout-note">
              Lanjut ke Checkout
            </Button>
            <p id="checkout-note" className="text-caption text-text-secondary">
              Hapus atau ubah produk yang bermasalah untuk melanjutkan.
            </p>
          </>
        ) : (
          <ButtonLink href={ROUTES.checkout} size="lg" fullWidth>
            Lanjut ke Checkout
          </ButtonLink>
        )}
        {whatsapp && quote.lines.length > 0 && (
          <a
            href={whatsappUrl(whatsapp, orderMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary text-body-s font-medium text-text-primary transition-colors duration-(--duration-base) hover:bg-secondary"
          >
            <MessageCircle aria-hidden className="size-4" />
            Atau pesan via WhatsApp
            <span className="sr-only">(membuka WhatsApp)</span>
          </a>
        )}
      </div>
    </div>
  );
}

function Shell({ count, children }: { count?: number; children: ReactNode }) {
  return (
    <main id="main-content">
      <Container className="py-10 desktop:py-16">
        <h1 className="text-h1 text-brand-cocoa-dark">
          Keranjang{count ? <span className="ml-3 font-body text-body-l text-text-secondary">{count} produk</span> : null}
        </h1>
        <div className="mt-8">{children}</div>
      </Container>
    </main>
  );
}
