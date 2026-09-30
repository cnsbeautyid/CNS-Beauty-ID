import { ClipboardList } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { adminOrderPath, ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { Pager } from "@/features/admin/pager";
import { formatDateTime, formatIDR } from "@/lib/utils/format";
import { parsePage } from "@/services/account/schemas";
import { requireStaff } from "@/services/admin/auth";
import { sanitizeSearch } from "@/services/admin/model";
import { listAdminOrders } from "@/services/admin/orders";
import { ORDER_STATUS, orderStatusInfo, type OrderStatus } from "@/services/order/status";

export const metadata = { title: "Pesanan" };

const STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([value, info]) => ({ value, label: info.label }));

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff(ROUTES.admin.orders);
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = rawStatus && rawStatus in ORDER_STATUS ? (rawStatus as OrderStatus) : undefined;
  const search = sanitizeSearch(params.q);
  const page = parsePage(params.halaman);
  const result = await listAdminOrders({ status, search: search || undefined, page });

  const href = (target: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (search) query.set("q", search);
    if (target > 1) query.set("halaman", String(target));
    const text = query.toString();
    return text ? `${ROUTES.admin.orders}?${text}` : ROUTES.admin.orders;
  };

  return (
    <>
      <AdminPageHeader title="Pesanan" description="Konfirmasi pembayaran transfer, proses, dan kirim pesanan." />
      <Form action={ROUTES.admin.orders} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select id="order-status" name="status" label="Status" placeholder="Semua status" options={STATUS_OPTIONS} defaultValue={status ?? ""} />
        </div>
        <div className="w-64">
          <Input id="order-search" name="q" label="Cari" placeholder="No. pesanan, nama, email" defaultValue={search} />
        </div>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
      </Form>

      {result.status === "error" ? (
        <ErrorState
          description="Pesanan belum dapat dimuat."
          action={
            <ButtonLink href={href(page)} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : result.orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" strokeWidth={1.25} />} title="Tidak ada pesanan" description={status || search ? "Tidak ada pesanan yang cocok dengan filter." : "Pesanan baru akan tampil di sini."} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full min-w-160 text-left text-body-s">
              <thead className="border-b border-border text-caption text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Pesanan</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pelanggan</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.orders.map((order) => {
                  const info = orderStatusInfo(order.status);
                  return (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <Link href={adminOrderPath(order.orderNumber)} className="font-medium underline-offset-4 hover:underline">
                          {order.orderNumber}
                        </Link>
                        <span className="block text-caption text-text-secondary">{formatDateTime(order.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {order.customerName}
                        <span className="block text-caption text-text-secondary">{order.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1">
                          <Badge tone={info.tone}>{info.label}</Badge>
                          {order.partnerType && <Badge tone="ai">Partner</Badge>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatIDR(order.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-caption text-text-secondary">{result.total.toLocaleString("id-ID")} pesanan</p>
          <Pager page={result.page} pageCount={result.pageCount} href={href} label="Halaman pesanan" />
        </div>
      )}
    </>
  );
}
