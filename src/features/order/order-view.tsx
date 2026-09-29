import { CircleCheck, Clock, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatDateTime, formatIDR } from "@/lib/utils/format";
import { whatsappUrl } from "@/lib/utils/whatsapp";
import type { PaymentSettings } from "@/services/checkout/payment-settings";
import type { OwnOrder } from "@/services/order/order";
import { orderStatusInfo } from "@/services/order/status";

import { ProofUpload } from "./proof-upload";

type OrderViewProps = {
  order: OwnOrder;
  userId: string;
  payment: PaymentSettings;
  deadline: string | null;
  whatsapp?: string;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `order-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="border-b border-border py-6">
      <h2 id={id} className="text-h4">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function OrderView({ order, userId, payment, deadline, whatsapp }: OrderViewProps) {
  const status = orderStatusInfo(order.status);
  const awaitingPayment = order.status === "pending_payment";

  return (
    <div className="grid gap-10 desktop:grid-cols-3">
      <div className="desktop:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="text-body-s text-text-secondary">Dibuat {formatDateTime(order.createdAt)}</p>
        </div>

        {awaitingPayment && (
          <Section title="Pembayaran">
            <div className="flex flex-col gap-5">
              <div className="rounded-lg bg-surface p-5">
                <p className="text-body-s text-text-secondary">Total yang harus dibayar</p>
                <p className="mt-1 font-display text-h3">{formatIDR(order.total)}</p>
                {deadline && (
                  <p className="mt-2 flex items-center gap-2 text-body-s text-text-primary">
                    <Clock aria-hidden className="size-4 text-warning" />
                    Bayar sebelum {formatDateTime(deadline)}
                  </p>
                )}
              </div>

              {payment.bankAccounts.length > 0 ? (
                <div>
                  <p className="text-body-s text-text-secondary">Transfer ke salah satu rekening berikut, sesuai total di atas:</p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {payment.bankAccounts.map((account) => (
                      <li key={`${account.bank}-${account.accountNumber}`} className="rounded-md border border-border p-4">
                        <p className="text-caption tracking-eyebrow text-text-secondary uppercase">{account.bank}</p>
                        <p className="mt-1 font-medium tracking-wide select-all">{account.accountNumber}</p>
                        <p className="text-body-s text-text-secondary">a.n. {account.accountName}</p>
                      </li>
                    ))}
                  </ul>
                  {payment.note && <p className="mt-3 text-body-s text-text-secondary">{payment.note}</p>}
                </div>
              ) : (
                <p className="text-body-s text-text-secondary">
                  Tim kami akan mengirimkan nomor rekening untuk pembayaran melalui WhatsApp. Kamu juga bisa menghubungi kami dengan
                  menyebutkan nomor pesanan <span className="font-medium text-text-primary">{order.orderNumber}</span>.
                </p>
              )}

              {order.proofCount > 0 ? (
                <p role="status" className="flex items-center gap-2 text-body-s text-success">
                  <CircleCheck aria-hidden className="size-4" />
                  Bukti pembayaran sudah kami terima dan sedang diverifikasi.
                </p>
              ) : (
                <ProofUpload orderId={order.id} userId={userId} />
              )}

              {whatsapp && (
                <a
                  href={whatsappUrl(whatsapp, `Halo CNS Beauty, saya ingin konfirmasi pembayaran pesanan ${order.orderNumber}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-body-s font-medium text-text-primary underline underline-offset-4"
                >
                  <MessageCircle aria-hidden className="size-4" />
                  Konfirmasi via WhatsApp
                  <span className="sr-only">(membuka WhatsApp)</span>
                </a>
              )}
            </div>
          </Section>
        )}

        <Section title="Produk">
          <ul className="flex flex-col gap-3 text-body-s">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.name}
                  {item.variantName && <span className="text-text-secondary"> · {item.variantName}</span>}
                  <span className="text-text-secondary">
                    {" "}
                    × {item.quantity} ({formatIDR(item.unitPrice)})
                  </span>
                </span>
                <span className="shrink-0">{formatIDR(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Pengiriman">
          <address className="text-body-s not-italic">
            <span className="font-medium">{order.shipping.recipient}</span> · {order.shipping.phone}
            <br />
            {order.shipping.address}, {order.shipping.district}, {order.shipping.city}, {order.shipping.province} {order.shipping.postalCode}
          </address>
          {order.shipping.trackingNumber && (
            <p className="mt-3 text-body-s">
              {order.shipping.courier ? `${order.shipping.courier} · ` : ""}No. resi{" "}
              <span className="font-medium select-all">{order.shipping.trackingNumber}</span>
            </p>
          )}
          {order.notes && <p className="mt-3 text-body-s text-text-secondary">Catatan: {order.notes}</p>}
        </Section>

        <Section title="Riwayat Pesanan">
          <ol className="flex flex-col gap-3 text-body-s">
            {order.history.map((entry, index) => (
              <li key={`${entry.createdAt}-${index}`} className="flex flex-col">
                <span className="font-medium">{entry.note ?? orderStatusInfo(entry.status).label}</span>
                <span className="text-caption text-text-secondary">{formatDateTime(entry.createdAt)}</span>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <aside aria-labelledby="order-total-title" className="h-fit rounded-lg bg-surface p-6 desktop:sticky desktop:top-28">
        <h2 id="order-total-title" className="text-h4">
          Rincian Pembayaran
        </h2>
        <dl className="mt-4 flex flex-col gap-2 text-body-s">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Subtotal</dt>
            <dd>{formatIDR(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Diskon{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
              <dd>− {formatIDR(order.discountTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Ongkos kirim</dt>
            <dd>{order.shippingTotal === 0 ? "Gratis" : formatIDR(order.shippingTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-body font-medium">
            <dt>Total</dt>
            <dd>{formatIDR(order.total)}</dd>
          </div>
        </dl>
        <ButtonLink href={ROUTES.products} variant="secondary" fullWidth className="mt-6">
          Lanjut belanja
        </ButtonLink>
      </aside>
    </div>
  );
}
