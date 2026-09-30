import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { AdminPageHeader } from "@/features/admin/page-header";
import { formatIDR } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { getConversionRate } from "@/services/admin/analytics";
import { getDashboard } from "@/services/admin/dashboard";

export const metadata = { title: "Dashboard" };

const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);

export default async function AdminDashboardPage() {
  await requireStaff(ROUTES.admin.dashboard);
  const [dashboard, conversion] = await Promise.all([getDashboard(30), getConversionRate(30)]);

  if (!dashboard) {
    return (
      <>
        <AdminPageHeader title="Dashboard" />
        <ErrorState
          description="Data dashboard belum dapat dimuat."
          action={
            <ButtonLink href={ROUTES.admin.dashboard} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </>
    );
  }

  const { kpis, queues } = dashboard;
  const stats = [
    { label: "GMV (dibayar)", value: formatIDR(kpis.gmv), hint: `${kpis.paidOrders} pesanan` },
    { label: "Rata-rata pesanan", value: formatIDR(kpis.averageOrderValue) },
    { label: "Pelanggan", value: dashboard.customers.toLocaleString("id-ID"), hint: `${dashboard.newCustomers} baru` },
    { label: "Repeat purchase", value: percent(kpis.repeatPurchaseRate), hint: "pelanggan dengan ≥2 pesanan dibayar" },
    { label: "Percakapan AI", value: dashboard.aiConversations.toLocaleString("id-ID"), hint: `${dashboard.aiEscalations} dialihkan ke tim` },
    { label: "GMV dibantu AI", value: formatIDR(kpis.aiAssistedGmv), hint: `${kpis.aiAssistedOrders} pesanan` },
    { label: "Penjualan partner", value: formatIDR(kpis.resellerGmv), hint: `${kpis.resellerOrders} pesanan` },
    { label: "Konversi", value: conversion === undefined ? "—" : percent(conversion), hint: "pengunjung yang membuat pesanan" },
  ];
  const tasks = [
    { label: "Menunggu konfirmasi pembayaran", count: queues.pendingPayment, href: `${ROUTES.admin.orders}?status=pending_payment` },
    { label: "Perlu dikirim", count: queues.toShip, href: `${ROUTES.admin.orders}?status=paid` },
    { label: "Pendaftaran partner", count: queues.applications, href: ROUTES.admin.resellers },
    { label: "Knowledge menunggu review", count: queues.knowledgeReview, href: ROUTES.admin.knowledge },
    { label: "Copy & klaim belum disetujui", count: queues.claimReview, href: ROUTES.admin.products },
    { label: "Stok menipis", count: queues.lowStock, href: ROUTES.admin.inventory },
  ];

  return (
    <>
      <AdminPageHeader title="Dashboard" description={`Ringkasan ${dashboard.days} hari terakhir. Semua angka dihitung dari data transaksi.`} />
      <dl className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <dt className="text-caption text-text-secondary">{stat.label}</dt>
            <dd className="mt-1 font-display text-h3 text-brand-cocoa-dark">{stat.value}</dd>
            {stat.hint && <dd className="text-caption text-text-secondary">{stat.hint}</dd>}
          </Card>
        ))}
      </dl>
      <section aria-labelledby="tasks-title" className="mt-10">
        <h2 id="tasks-title" className="mb-4 text-h4">
          Perlu tindakan
        </h2>
        <ul className="grid gap-2 tablet:grid-cols-2">
          {tasks.map((task) => (
            <li key={task.label}>
              <Link href={task.href} className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border bg-background px-4 py-3 text-body-s hover:border-brand-cocoa">
                <span>{task.label}</span>
                <span className={task.count > 0 ? "font-semibold text-text-primary" : "text-text-secondary"}>{task.count.toLocaleString("id-ID")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
