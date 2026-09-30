import { Heart, Package, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { OrderList } from "@/features/account/order-list";
import { requireUser } from "@/lib/auth/session";
import { getLoyaltySummary, getOwnProfile, listOwnOrders, listWishlistIds } from "@/services/account/account";

export const metadata = { title: "Akun Saya" };

function Panel({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card as="section" padding="lg" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-h4">
          <span aria-hidden className="text-brand-rose-gold">
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

const ICON = { className: "size-5", strokeWidth: 1.5 } as const;

export default async function AccountDashboardPage() {
  await requireUser(ROUTES.account.dashboard);
  const [profile, orders, loyalty, wishlist] = await Promise.all([
    getOwnProfile(),
    listOwnOrders(1, 3),
    getLoyaltySummary(),
    listWishlistIds(),
  ]);
  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h1 text-brand-cocoa-dark">{firstName ? `Halo, ${firstName}` : "Akun Saya"}</h1>

      <Panel
        icon={<Package {...ICON} />}
        title="Pesanan terbaru"
        action={
          <Link href={ROUTES.account.orders} className="text-body-s font-medium underline underline-offset-4">
            Lihat semua
          </Link>
        }
      >
        {orders.status === "error" ? (
          <ErrorState className="py-6" description="Pesanan belum dapat dimuat. Silakan coba lagi." />
        ) : orders.orders.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-body-s text-text-secondary">Kamu belum punya pesanan.</p>
            <ButtonLink href={ROUTES.products} variant="secondary" size="sm">
              Mulai belanja
            </ButtonLink>
          </div>
        ) : (
          <OrderList orders={orders.orders} />
        )}
      </Panel>

      <div className="grid gap-6 tablet:grid-cols-2">
        <Panel icon={<Star {...ICON} />} title="CNS Rewards">
          {loyalty ? (
            <p className="text-body-s text-text-secondary">
              <span className="block font-display text-h3 text-text-primary">{loyalty.balance.toLocaleString("id-ID")} poin</span>
              {loyalty.tierName ? `Tingkat ${loyalty.tierName}.` : "Poin didapat dari pesanan yang sudah dibayar."}
            </p>
          ) : (
            <p className="text-body-s text-text-secondary">Poin belum dapat dimuat.</p>
          )}
        </Panel>

        <Panel
          icon={<Heart {...ICON} />}
          title="Wishlist"
          action={
            <Link href={ROUTES.account.wishlist} className="text-body-s font-medium underline underline-offset-4">
              Buka
            </Link>
          }
        >
          <p className="text-body-s text-text-secondary">
            {wishlist.length > 0 ? `${wishlist.length} produk tersimpan.` : "Simpan produk favoritmu dari halaman produk."}
          </p>
        </Panel>
      </div>

      <Panel icon={<Sparkles {...ICON} />} title="Rekomendasi untukmu">
        <p className="text-body-s text-text-secondary">
          Ceritakan kondisi kulitmu kepada CNS Beauty AI untuk rekomendasi produk. Profil kulit dan rutinitas pribadi hadir bersama Skin
          Quiz.
        </p>
        <div>
          <AskAIButton prefill="Produk apa yang cocok untuk kulit saya?">Tanya Beauty AI</AskAIButton>
        </div>
      </Panel>
    </div>
  );
}
