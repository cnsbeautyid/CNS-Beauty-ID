import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { adminOrderPath, ROUTES } from "@/constants/routes";
import { ActionButton } from "@/features/admin/action-button";
import { orderAction } from "@/features/admin/actions";
import { AdminPageHeader } from "@/features/admin/page-header";
import { ShipForm } from "@/features/admin/ship-form";
import { formatDateTime, formatIDR } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { allowedOrderActions, ORDER_ACTION_LABELS } from "@/services/admin/model";
import { getAdminOrder } from "@/services/admin/orders";
import { orderStatusInfo } from "@/services/order/status";

export const metadata = { title: "Detail pesanan" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const number = decodeURIComponent(orderNumber);
  await requireStaff(adminOrderPath(number));
  const order = await getAdminOrder(number);

  if (order === null) notFound();
  if (order === undefined) {
    return (
      <>
        <AdminPageHeader title={number} />
        <ErrorState
          description="Pesanan belum dapat dimuat."
          action={
            <ButtonLink href={adminOrderPath(number)} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </>
    );
  }

  const status = orderStatusInfo(order.status);
  const actions = allowedOrderActions(order.status);
  const payment = order.payments[0];

  return (
    <>
      <AdminPageHeader
        title={order.orderNumber}
        description={`Dibuat ${formatDateTime(order.createdAt)} · sumber ${order.source}${order.aiAssisted ? " · dibantu Beauty AI" : ""}`}
        action={
          <ButtonLink href={ROUTES.admin.orders} variant="ghost" size="sm">
            Kembali ke daftar
          </ButtonLink>
        }
      />
      <div className="grid gap-6 desktop:grid-cols-3">
        <div className="flex flex-col gap-6 desktop:col-span-2">
          <Card padding="lg" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              {order.partnerType && (
                <Badge tone="ai">
                  Partner {order.partnerType}
                  {order.partnerTierLevel ? ` L${order.partnerTierLevel}` : ""}
                  {order.isDropship ? " · dropship" : ""}
                </Badge>
              )}
            </div>
            <table className="w-full text-left text-body-s">
              <caption className="sr-only">Produk dalam pesanan</caption>
              <thead className="text-caption text-text-secondary">
                <tr>
                  <th scope="col" className="py-2 font-medium">Produk</th>
                  <th scope="col" className="py-2 text-right font-medium">Jumlah</th>
                  <th scope="col" className="py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">
                      {item.name}
                      {item.variantName && <span className="text-text-secondary"> · {item.variantName}</span>}
                      <span className="block text-caption text-text-secondary">{formatIDR(item.unitPrice)} / pcs</span>
                    </td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatIDR(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-1 text-body-s">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="text-right">{formatIDR(order.subtotal)}</dd>
              {order.discountTotal > 0 && (
                <>
                  <dt className="text-text-secondary">Diskon{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd className="text-right">− {formatIDR(order.discountTotal)}</dd>
                </>
              )}
              {order.pointsDiscount > 0 && (
                <>
                  <dt className="text-text-secondary">Poin ditukar</dt>
                  <dd className="text-right">− {formatIDR(order.pointsDiscount)}</dd>
                </>
              )}
              <dt className="text-text-secondary">Ongkir</dt>
              <dd className="text-right">{formatIDR(order.shippingTotal)}</dd>
              <dt className="font-medium">Total</dt>
              <dd className="text-right font-medium">{formatIDR(order.total)}</dd>
            </dl>
            {order.notes && <p className="text-body-s text-text-secondary">Catatan pelanggan: {order.notes}</p>}
          </Card>

          <Card as="section" padding="lg" aria-labelledby="history-title">
            <h2 id="history-title" className="mb-3 text-h4">
              Riwayat status
            </h2>
            <ol className="flex flex-col gap-2 text-body-s">
              {order.history.map((entry, index) => (
                <li key={`${entry.createdAt}-${index}`} className="flex flex-wrap justify-between gap-2">
                  <span>
                    <span className="font-medium">{orderStatusInfo(entry.status).label}</span>
                    {entry.note && <span className="text-text-secondary"> · {entry.note}</span>}
                  </span>
                  <span className="text-caption text-text-secondary">{formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card as="section" padding="lg" aria-labelledby="actions-title" className="flex flex-col gap-4">
            <h2 id="actions-title" className="text-h4">
              Tindakan
            </h2>
            {actions.length === 0 && <p className="text-body-s text-text-secondary">Tidak ada tindakan untuk status ini.</p>}
            {actions.includes("confirm_payment") && (
              <ActionButton
                action={orderAction}
                payload={{ orderId: order.id, action: "confirm_payment" }}
                label={ORDER_ACTION_LABELS.confirm_payment}
                confirmLabel={`Ya, dana ${formatIDR(order.total)} sudah diterima`}
                variant="primary"
              />
            )}
            {actions.includes("start_processing") && (
              <ActionButton action={orderAction} payload={{ orderId: order.id, action: "start_processing" }} label={ORDER_ACTION_LABELS.start_processing} />
            )}
            {actions.includes("ship") && <ShipForm orderId={order.id} courier={order.shipping.courier} />}
            {actions.includes("deliver") && (
              <ActionButton action={orderAction} payload={{ orderId: order.id, action: "deliver" }} label={ORDER_ACTION_LABELS.deliver} confirmLabel="Ya, sudah diterima" />
            )}
            {actions.includes("cancel") && (
              <ActionButton
                action={orderAction}
                payload={{ orderId: order.id, action: "cancel" }}
                label={ORDER_ACTION_LABELS.cancel}
                confirmLabel="Ya, batalkan"
                note={{ label: "Alasan pembatalan", required: true }}
                variant="ghost"
              />
            )}
          </Card>

          <Card as="section" padding="lg" aria-labelledby="payment-title" className="flex flex-col gap-2 text-body-s">
            <h2 id="payment-title" className="text-h4">
              Pembayaran
            </h2>
            {payment ? (
              <p>
                {payment.provider} · {payment.method ?? "—"} · {payment.status}
                {payment.expiresAt && order.status === "pending_payment" && (
                  <span className="block text-caption text-text-secondary">Batas bayar {formatDateTime(payment.expiresAt)}</span>
                )}
              </p>
            ) : (
              <p className="text-text-secondary">Belum ada data pembayaran.</p>
            )}
            {order.paidAt && <p className="text-caption text-text-secondary">Dibayar {formatDateTime(order.paidAt)}</p>}
            <h3 className="mt-2 font-medium">Bukti transfer</h3>
            {order.proofs.length === 0 ? (
              <p className="text-text-secondary">Belum ada bukti transfer.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {order.proofs.map((proof) => (
                  <li key={proof.name}>
                    <a href={proof.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      {proof.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card as="section" padding="lg" aria-labelledby="customer-title" className="flex flex-col gap-1 text-body-s">
            <h2 id="customer-title" className="mb-2 text-h4">
              Pelanggan & pengiriman
            </h2>
            <p className="font-medium">{order.customer.name}</p>
            <p>{order.customer.email}</p>
            <p>{order.customer.phone}</p>
            <p className="mt-2 font-medium">{order.shipping.recipient}</p>
            <p>{order.shipping.phone}</p>
            <p>
              {order.shipping.address}, {order.shipping.district}, {order.shipping.city}, {order.shipping.province} {order.shipping.postalCode}
            </p>
            {order.shipping.trackingNumber && (
              <p className="mt-2">
                {order.shipping.courier} · resi <span className="font-medium">{order.shipping.trackingNumber}</span>
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
