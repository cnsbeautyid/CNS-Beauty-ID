import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { AccountStrip } from "@/features/auth/sign-out-button";
import { CheckoutForm } from "@/features/checkout/checkout-form";
import { OrderSummary } from "@/features/checkout/order-summary";
import { getSessionUser } from "@/lib/auth/session";
import { formatIDR } from "@/lib/utils/format";
import { CartStoreError, readCart } from "@/services/cart/store";
import { quoteCart } from "@/services/cart/quote";
import { quoteErrorMessage } from "@/services/cart/quote-schema";
import { getCheckoutPrefill } from "@/services/checkout/addresses";
import { getPaymentSettings, getShippingInfo } from "@/services/checkout/payment";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

function Shell({ email, children }: { email: string | null; children: ReactNode }) {
  return (
    <main id="main-content">
      <Container className="py-10 desktop:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-h1 text-brand-cocoa-dark">Checkout</h1>
          <AccountStrip email={email} />
        </div>
        <div className="mt-8">{children}</div>
      </Container>
    </main>
  );
}

const BackToCart = () => (
  <ButtonLink href={ROUTES.cart} variant="secondary">
    Kembali ke keranjang
  </ButtonLink>
);

export default async function CheckoutPage() {
  const user = await getSessionUser();
  // Login is required (owner decision, Phase 7). Re-checked in the action.
  if (!user) redirect(`${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.checkout)}`);

  let cart;
  try {
    cart = await readCart();
  } catch (error) {
    if (!(error instanceof CartStoreError)) throw error;
    return (
      <Shell email={user.email}>
        <ErrorState description="Keranjang belum dapat dimuat. Silakan coba lagi dalam beberapa saat." action={<BackToCart />} />
      </Shell>
    );
  }
  if (cart.items.length === 0) {
    return (
      <Shell email={user.email}>
        <EmptyState
          icon={<ShoppingBag className="size-8" strokeWidth={1.25} />}
          title="Keranjangmu masih kosong"
          description="Tambahkan produk ke keranjang sebelum checkout."
          action={<ButtonLink href={ROUTES.products}>Jelajahi Produk</ButtonLink>}
        />
      </Shell>
    );
  }

  const [result, payment, shipping, prefill] = await Promise.all([
    quoteCart(cart, user.id),
    getPaymentSettings(),
    getShippingInfo(),
    getCheckoutPrefill(),
  ]);

  if (result.status !== "ok") {
    return (
      <Shell email={user.email}>
        <ErrorState
          title={result.status === "unavailable" ? "Checkout belum tersedia" : "Terjadi kendala"}
          description={
            result.status === "unavailable"
              ? "Total belanja belum dapat dihitung saat ini. Produk di keranjangmu tetap tersimpan; kamu juga bisa memesan melalui WhatsApp dari halaman keranjang."
              : "Checkout belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          }
          action={<BackToCart />}
        />
      </Shell>
    );
  }

  const { quote } = result;
  if (quote.errors.length > 0) {
    return (
      <Shell email={user.email}>
        <ErrorState
          title="Periksa keranjangmu"
          description={[...new Set(quote.errors.map(quoteErrorMessage))].join(" ")}
          action={<BackToCart />}
        />
      </Shell>
    );
  }

  const defaultAddress = prefill.addresses[0];
  const shippingNote = [
    quote.shippingTotal === 0 ? "Ongkos kirim gratis untuk pesanan ini." : `Ongkos kirim ${formatIDR(quote.shippingTotal)}.`,
    shipping.origin && `Dikirim dari ${shipping.origin}`,
    shipping.dispatchDays && `dalam ${shipping.dispatchDays} hari kerja setelah pembayaran dikonfirmasi.`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Shell email={user.email}>
      <div className="grid gap-10 desktop:grid-cols-3">
        <div className="desktop:col-span-2">
          <CheckoutForm
            total={quote.total}
            defaultShipping={
              defaultAddress ?? {
                recipientName: prefill.fullName ?? "",
                phone: prefill.phone ?? "",
                addressLine: "",
                district: "",
                city: "",
                province: "",
                postalCode: "",
              }
            }
            savedAddresses={prefill.addresses}
            shippingNote={shippingNote}
            coupon={quote.coupon}
            expiryHours={payment.expiryHours}
          />
        </div>
        <OrderSummary quote={quote} />
      </div>
    </Shell>
  );
}
