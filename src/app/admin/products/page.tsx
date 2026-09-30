import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { adminProductPath, ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { ContentStatusBadge, PublishStatusBadge } from "@/features/admin/status-badge";
import { formatIDR } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { listAdminProducts } from "@/services/admin/catalog";

export const metadata = { title: "Produk" };

export default async function AdminProductsPage() {
  await requireStaff(ROUTES.admin.products);
  const products = await listAdminProducts();

  return (
    <>
      <AdminPageHeader title="Produk" description="Harga, stok, status tampil, serta persetujuan deskripsi, manfaat, dan FAQ. Teks hanya tampil di toko setelah disetujui." />
      {products === null ? (
        <ErrorState
          description="Produk belum dapat dimuat."
          action={
            <ButtonLink href={ROUTES.admin.products} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState title="Belum ada produk" description="Produk yang ditambahkan di database akan tampil di sini." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full min-w-160 text-left text-body-s">
            <thead className="border-b border-border text-caption text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Produk</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Copy</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Harga</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <Link href={adminProductPath(product.id)} className="font-medium underline-offset-4 hover:underline">
                      {product.name}
                    </Link>
                    <span className="block text-caption text-text-secondary">{product.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PublishStatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ContentStatusBadge status={product.copyStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">{formatIDR(product.price)}</td>
                  <td className={product.stock <= product.lowStockThreshold ? "px-4 py-3 text-right font-semibold text-error" : "px-4 py-3 text-right"}>{product.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
