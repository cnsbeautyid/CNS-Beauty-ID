import { notFound } from "next/navigation";
import { z } from "zod";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { adminProductPath, productPath, ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { ProductForm } from "@/features/admin/product-form";
import { ReviewControls } from "@/features/admin/review-controls";
import { ContentStatusBadge } from "@/features/admin/status-badge";
import { formatDateTime } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { getAdminProduct, type ReviewItem } from "@/services/admin/catalog";

export const metadata = { title: "Edit produk" };

function ReviewList({ title, kind, items }: { title: string; kind: "benefit" | "faq"; items: ReviewItem[] }) {
  return (
    <Card as="section" padding="lg" aria-label={title} className="flex flex-col gap-4">
      <h2 className="text-h4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-body-s text-text-secondary">Belum ada.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="grid gap-3 py-4 first:pt-0 tablet:grid-cols-3">
              <div className="tablet:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <ContentStatusBadge status={item.status} />
                </div>
                {item.body && <p className="mt-1 text-body-s text-text-secondary">{item.body}</p>}
                {item.evidenceReference && <p className="mt-1 text-caption text-text-secondary">Bukti: {item.evidenceReference}</p>}
                {item.reviewedAt && item.status === "approved" && <p className="text-caption text-text-secondary">Disetujui {formatDateTime(item.reviewedAt)}</p>}
              </div>
              <ReviewControls kind={kind} id={item.id} status={item.status} evidenceReference={item.evidenceReference} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function AdminProductPage({ params }: PageProps<"/admin/products/[productId]">) {
  const { productId } = await params;
  await requireStaff(adminProductPath(productId));
  if (!z.uuid().safeParse(productId).success) notFound();
  const product = await getAdminProduct(productId);

  if (product === null) notFound();
  if (product === undefined) {
    return (
      <>
        <AdminPageHeader title="Produk" />
        <ErrorState
          description="Produk belum dapat dimuat."
          action={
            <ButtonLink href={adminProductPath(productId)} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`SKU ${product.sku} · diperbarui ${formatDateTime(product.updatedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {product.status === "active" && (
              <ButtonLink href={productPath(product.slug)} variant="ghost" size="sm">
                Lihat di toko
              </ButtonLink>
            )}
            <ButtonLink href={ROUTES.admin.products} variant="ghost" size="sm">
              Kembali
            </ButtonLink>
          </div>
        }
      />
      <div className="flex flex-col gap-6">
        <Card as="section" padding="lg" aria-labelledby="commerce-title">
          <h2 id="commerce-title" className="mb-4 text-h4">
            Harga, stok & status
          </h2>
          <ProductForm
            defaults={{
              productId: product.id,
              price: product.price,
              comparePrice: product.comparePrice ?? "",
              stock: product.stock,
              lowStockThreshold: product.lowStockThreshold,
              status: product.status as "draft" | "active" | "archived",
              isFeatured: product.isFeatured,
            }}
          />
          {product.variants.length > 0 && (
            <p className="mt-4 text-caption text-text-secondary">Produk ini memiliki {product.variants.length} varian; stok varian dikelola di menu Inventori.</p>
          )}
        </Card>

        <Card as="section" padding="lg" aria-labelledby="copy-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="copy-title" className="text-h4">
              Deskripsi & positioning
            </h2>
            <ContentStatusBadge status={product.copyStatus} />
          </div>
          <div className="grid gap-4 tablet:grid-cols-3">
            <div className="flex flex-col gap-3 text-body-s tablet:col-span-2">
              <p className="whitespace-pre-line">{product.description ?? <span className="text-text-secondary">Belum ada deskripsi.</span>}</p>
              {product.positioning && <p className="text-text-secondary">Positioning: {product.positioning}</p>}
              {product.copyEvidenceReference && <p className="text-caption text-text-secondary">Bukti: {product.copyEvidenceReference}</p>}
            </div>
            <ReviewControls kind="product_copy" id={product.id} status={product.copyStatus} evidenceReference={product.copyEvidenceReference} />
          </div>
          <p className="text-caption text-text-secondary">Teks ini diedit di database. Mengubah teks yang sudah disetujui otomatis mengembalikannya ke &ldquo;Menunggu review&rdquo;.</p>
        </Card>

        <ReviewList title="Manfaat produk" kind="benefit" items={product.benefits} />
        <ReviewList title="FAQ produk" kind="faq" items={product.faqs} />
      </div>
    </>
  );
}
