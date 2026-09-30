import { ClipboardList } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { OrderList } from "@/features/account/order-list";
import { PartnerGateNotice } from "@/features/reseller/partner-gate-notice";
import { listPartnerOrders, requirePartner } from "@/services/reseller/reseller";

export const metadata = { title: "Pesanan Partner" };

export default async function ResellerOrdersPage() {
  const gate = await requirePartner(ROUTES.resellerPortal.orders);
  if (gate.status !== "ok") return <PartnerGateNotice status={gate.status} retryHref={ROUTES.resellerPortal.orders} />;
  const orders = await listPartnerOrders();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-brand-cocoa-dark">Pesanan Partner</h1>
        <p className="mt-2 text-body-s text-text-secondary">Pesanan yang kamu buat dengan harga partner. Detail, pembayaran, dan pengiriman ada di halaman pesanan.</p>
      </div>
      {orders === null ? (
        <ErrorState
          description="Pesanan partner belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.resellerPortal.orders} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" strokeWidth={1.25} />}
          title="Belum ada pesanan partner"
          description="Pesanan dengan harga partner akan tampil di sini."
          action={<ButtonLink href={ROUTES.resellerPortal.products}>Lihat harga partner</ButtonLink>}
        />
      ) : (
        <OrderList
          orders={orders.map((order) => ({
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            status: order.status,
            total: order.total,
            itemCount: order.items.length,
          }))}
        />
      )}
    </div>
  );
}
