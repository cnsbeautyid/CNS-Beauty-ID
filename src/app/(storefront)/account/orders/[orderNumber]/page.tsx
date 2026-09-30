import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { orderPath, ROUTES } from "@/constants/routes";
import { OrderView } from "@/features/order/order-view";
import { requireUser } from "@/lib/auth/session";
import { getPaymentSettings, paymentDeadline } from "@/services/checkout/payment";
import { getPublicContact } from "@/services/content/contact";
import { getOwnOrder } from "@/services/order/order";

export const metadata: Metadata = { title: "Detail Pesanan" };

export default async function OrderPage({ params }: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const number = decodeURIComponent(orderNumber);
  if (!/^[A-Z0-9-]{4,40}$/.test(number)) notFound();

  const user = await requireUser(orderPath(number));

  const [result, payment, contact] = await Promise.all([getOwnOrder(number, user.id), getPaymentSettings(), getPublicContact()]);
  if (result.status === "not_found") notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={ROUTES.account.orders} className="inline-flex min-h-11 items-center gap-1 text-body-s text-text-secondary hover:text-text-primary">
          <ChevronLeft aria-hidden className="size-4" />
          Semua pesanan
        </Link>
        <p className="text-caption tracking-eyebrow text-text-secondary uppercase">Pesanan</p>
        <h1 className="text-h1 text-brand-cocoa-dark">{number}</h1>
      </div>
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
  );
}
