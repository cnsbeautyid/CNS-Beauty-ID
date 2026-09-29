import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { orderPath, ROUTES } from "@/constants/routes";
import { AccountStrip } from "@/features/auth/sign-out-button";
import { OrderView } from "@/features/order/order-view";
import { getSessionUser } from "@/lib/auth/session";
import { getPaymentSettings, paymentDeadline } from "@/services/checkout/payment";
import { getPublicContact } from "@/services/content/contact";
import { getOwnOrder } from "@/services/order/order";

export const metadata: Metadata = {
  title: "Detail Pesanan",
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const number = decodeURIComponent(orderNumber);
  if (!/^[A-Z0-9-]{4,40}$/.test(number)) notFound();

  const user = await getSessionUser();
  if (!user) redirect(`${ROUTES.signIn}?next=${encodeURIComponent(orderPath(number))}`);

  const [result, payment, contact] = await Promise.all([getOwnOrder(number, user.id), getPaymentSettings(), getPublicContact()]);
  if (result.status === "not_found") notFound();

  return (
    <main id="main-content">
      <Container className="py-10 desktop:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-caption tracking-eyebrow text-text-secondary uppercase">Pesanan</p>
            <h1 className="text-h1 text-brand-cocoa-dark">{number}</h1>
          </div>
          <AccountStrip email={user.email} />
        </div>
        <div className="mt-8">
          {result.status === "error" ? (
            <ErrorState
              description="Detail pesanan belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
              action={
                <ButtonLink href={orderPath(number)} variant="secondary">
                  Coba lagi
                </ButtonLink>
              }
            />
          ) : (
            <OrderView
              order={result.order}
              userId={user.id}
              payment={payment}
              deadline={result.order.payment?.expiresAt ?? paymentDeadline(new Date(result.order.createdAt), payment.expiryHours).toISOString()}
              whatsapp={contact?.whatsapp}
            />
          )}
        </div>
      </Container>
    </main>
  );
}
