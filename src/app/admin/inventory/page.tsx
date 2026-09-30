import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { adminProductPath, ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { StockForm } from "@/features/admin/stock-form";
import { PublishStatusBadge } from "@/features/admin/status-badge";
import { requireStaff } from "@/services/admin/auth";
import { listAdminProducts } from "@/services/admin/catalog";

export const metadata = { title: "Inventori" };

export default async function AdminInventoryPage() {
  await requireStaff(ROUTES.admin.inventory);
  const products = await listAdminProducts();
  const sorted = products ? [...products].sort((a, b) => a.stock - a.lowStockThreshold - (b.stock - b.lowStockThreshold)) : null;

  return (
    <>
      <AdminPageHeader
        title="Inventori"
        description="Stok yang tersedia untuk dijual. Checkout mengurangi stok saat pesanan dibuat dan mengembalikannya jika pesanan dibatalkan atau kedaluwarsa."
      />
      {sorted === null ? (
        <ErrorState
          description="Inventori belum dapat dimuat."
          action={
            <ButtonLink href={ROUTES.admin.inventory} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState title="Belum ada produk" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
          {sorted.map((product) => {
            const low = product.stock <= product.lowStockThreshold;
            return (
              <li key={product.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div>
                  <Link href={adminProductPath(product.id)} className="font-medium underline-offset-4 hover:underline">
                    {product.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-secondary">
                    <PublishStatusBadge status={product.status} />
                    {low && <Badge tone="error">{product.stock === 0 ? "Habis" : "Menipis"}</Badge>}
                    <span>Batas menipis: {product.lowStockThreshold}</span>
                  </div>
                </div>
                <StockForm productId={product.id} productName={product.name} stock={product.stock} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
