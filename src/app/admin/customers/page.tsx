import { Users } from "lucide-react";
import Form from "next/form";

import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { Pager } from "@/features/admin/pager";
import { formatDate, formatIDR } from "@/lib/utils/format";
import { parsePage } from "@/services/account/schemas";
import { requireStaff } from "@/services/admin/auth";
import { sanitizeSearch } from "@/services/admin/model";
import { listCustomers } from "@/services/admin/people";

export const metadata = { title: "Pelanggan" };

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireStaff(ROUTES.admin.customers);
  const params = await searchParams;
  const search = sanitizeSearch(params.q);
  const page = parsePage(params.halaman);
  const result = await listCustomers({ search: search || undefined, page });

  const href = (target: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (target > 1) query.set("halaman", String(target));
    const text = query.toString();
    return text ? `${ROUTES.admin.customers}?${text}` : ROUTES.admin.customers;
  };

  return (
    <>
      <AdminPageHeader title="Pelanggan" description="Daftar akun pelanggan (hanya baca). Data pribadi hanya dipakai untuk melayani pesanan." />
      <Form action={ROUTES.admin.customers} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Input id="customer-search" name="q" label="Cari" placeholder="Nama, email, atau nomor HP" defaultValue={search} />
        </div>
        <Button type="submit" variant="secondary">
          Cari
        </Button>
      </Form>
      {result.status === "error" ? (
        <ErrorState
          description="Pelanggan belum dapat dimuat."
          action={
            <ButtonLink href={href(page)} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : result.customers.length === 0 ? (
        <EmptyState icon={<Users className="size-8" strokeWidth={1.25} />} title="Tidak ada pelanggan" description={search ? "Tidak ada pelanggan yang cocok." : undefined} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full min-w-160 text-left text-body-s">
              <thead className="border-b border-border text-caption text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nama</th>
                  <th scope="col" className="px-4 py-3 font-medium">Kontak</th>
                  <th scope="col" className="px-4 py-3 font-medium">Bergabung</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Pesanan dibayar</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total belanja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3 font-medium">{customer.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {customer.email ?? "—"}
                      {customer.phone && <span className="block text-caption text-text-secondary">{customer.phone}</span>}
                    </td>
                    <td className="px-4 py-3">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3 text-right">{customer.paidOrders}</td>
                    <td className="px-4 py-3 text-right">{formatIDR(customer.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-caption text-text-secondary">{result.total.toLocaleString("id-ID")} pelanggan</p>
          <Pager page={result.page} pageCount={result.pageCount} href={href} label="Halaman pelanggan" />
        </div>
      )}
    </>
  );
}
