import { Package } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { OrderList } from "@/features/account/order-list";
import { requireUser } from "@/lib/auth/session";
import { listOwnOrders } from "@/services/account/account";
import { parsePage } from "@/services/account/schemas";

export const metadata = { title: "Pesanan" };

const pageHref = (page: number) => (page <= 1 ? ROUTES.account.orders : `${ROUTES.account.orders}?halaman=${page}`);

export default async function AccountOrdersPage({ searchParams }: PageProps<"/account/orders">) {
  await requireUser(ROUTES.account.orders);
  const page = parsePage((await searchParams).halaman);
  const result = await listOwnOrders(page);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-brand-cocoa-dark">Pesanan</h1>
      {result.status === "error" ? (
        <ErrorState
          description="Pesanan belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={pageHref(page)} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : result.orders.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" strokeWidth={1.25} />}
          title={page > 1 ? "Tidak ada pesanan di halaman ini" : "Belum ada pesanan"}
          description="Pesanan yang kamu buat akan muncul di sini."
          action={<ButtonLink href={page > 1 ? ROUTES.account.orders : ROUTES.products}>{page > 1 ? "Ke halaman pertama" : "Mulai belanja"}</ButtonLink>}
        />
      ) : (
        <>
          <OrderList orders={result.orders} />
          {result.pageCount > 1 && (
            <nav aria-label="Halaman pesanan" className="flex items-center justify-between gap-4 text-body-s">
              {result.page > 1 ? (
                <ButtonLink href={pageHref(result.page - 1)} variant="secondary" size="sm">
                  Sebelumnya
                </ButtonLink>
              ) : (
                <span />
              )}
              <span className="text-text-secondary">
                Halaman {result.page} dari {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <ButtonLink href={pageHref(result.page + 1)} variant="secondary" size="sm">
                  Berikutnya
                </ButtonLink>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
