import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { productPath, ROUTES } from "@/constants/routes";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { PartnerGateNotice } from "@/features/reseller/partner-gate-notice";
import { formatIDR } from "@/lib/utils/format";
import { MAX_QUANTITY } from "@/services/cart/model";
import { getPartnerPriceList, requirePartner } from "@/services/reseller/reseller";

export const metadata = { title: "Produk & Harga" };

export default async function ResellerProductsPage() {
  const gate = await requirePartner(ROUTES.resellerPortal.products);
  if (gate.status !== "ok") return <PartnerGateNotice status={gate.status} retryHref={ROUTES.resellerPortal.products} />;
  const { partner } = gate;
  const rows = await getPartnerPriceList(partner);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h1 text-brand-cocoa-dark">Produk & Harga Partner</h1>
        <p className="mt-2 max-w-2xl text-body-s text-text-secondary">
          Harga di bawah berlaku untuk levelmu dan dihitung ulang di keranjang serta checkout. Selisih per unit adalah selisih terhadap harga eceran CNS Beauty,
          bukan jaminan keuntungan. Program partner memakai harga partner, tanpa komisi.
        </p>
      </div>

      {rows === null ? (
        <ErrorState
          description="Daftar harga partner belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.resellerPortal.products} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada produk" description="Produk yang tersedia untuk partner akan tampil di sini." />
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => {
            const reachable = row.own !== null && row.own.minQty <= MAX_QUANTITY;
            return (
              <Card as="li" key={row.productId} padding="lg" className="grid gap-6 desktop:grid-cols-5">
                <div className="flex flex-col gap-3 desktop:col-span-3">
                  <h2 className="text-h4">
                    <Link href={productPath(row.slug)} className="hover:underline hover:underline-offset-4">
                      {row.name}
                    </Link>
                  </h2>
                  {row.own ? (
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-s tablet:grid-cols-4">
                      <div>
                        <dt className="text-caption text-text-secondary">Harga eceran</dt>
                        <dd>{formatIDR(row.retailPrice)}</dd>
                      </div>
                      <div>
                        <dt className="text-caption text-text-secondary">Harga partner ({row.own.name})</dt>
                        <dd className="font-medium">{formatIDR(row.own.unitPrice)}</dd>
                      </div>
                      <div>
                        <dt className="text-caption text-text-secondary">Minimal beli</dt>
                        <dd>{row.own.minQty.toLocaleString("id-ID")} pcs</dd>
                      </div>
                      <div>
                        <dt className="text-caption text-text-secondary">Selisih per unit</dt>
                        <dd className="text-success">{row.marginPerUnit !== null ? formatIDR(row.marginPerUnit) : "—"}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-body-s text-text-secondary">Harga partner untuk levelmu belum tersedia pada produk ini.</p>
                  )}
                  {row.tiers.length > 1 && (
                    <details className="text-body-s">
                      <summary className="min-h-11 cursor-pointer content-center text-text-secondary">Lihat semua level</summary>
                      <table className="mt-2 w-full text-left">
                        <thead className="text-caption text-text-secondary">
                          <tr>
                            <th scope="col" className="py-1 font-normal">
                              Level
                            </th>
                            <th scope="col" className="py-1 font-normal">
                              Minimal beli
                            </th>
                            <th scope="col" className="py-1 font-normal">
                              Harga per unit
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.tiers.map((tier) => (
                            <tr key={tier.level} className={tier.level === partner.tierLevel ? "font-medium" : undefined}>
                              <td className="py-1">
                                {tier.name}
                                {tier.level === partner.tierLevel && " (levelmu)"}
                              </td>
                              <td className="py-1">{tier.minQty.toLocaleString("id-ID")} pcs</td>
                              <td className="py-1">{formatIDR(tier.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-2 desktop:col-span-2">
                  {row.own && reachable ? (
                    <AddToCartButton productId={row.productId} available={row.available} quantity={row.own.minQty} size="md" fullWidth />
                  ) : row.own ? (
                    <p className="text-body-s text-text-secondary">
                      Minimal pembelian level ini melebihi batas keranjang online. Hubungi tim CNS Beauty untuk pemesanan.
                    </p>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
