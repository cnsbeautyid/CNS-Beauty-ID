import { Gift, Star } from "lucide-react";

import { TrackEvent } from "@/components/analytics/track-event";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { RedeemButton } from "@/features/loyalty/redeem-button";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatIDR } from "@/lib/utils/format";
import { getLoyaltyProgramme, getOwnLoyaltyAccount, listOwnRedemptions, listOwnTransactions } from "@/services/loyalty/loyalty";
import { describeRule, eventLabel, tierProgress } from "@/services/loyalty/model";

export const metadata = { title: "CNS Rewards" };

const points = (value: number) => `${value.toLocaleString("id-ID")} poin`;

export default async function AccountLoyaltyPage() {
  await requireUser(ROUTES.account.loyalty);
  const [programme, account, history, redemptions] = await Promise.all([
    getLoyaltyProgramme(),
    getOwnLoyaltyAccount(),
    listOwnTransactions(),
    listOwnRedemptions(),
  ]);

  if (!programme || !account) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-brand-cocoa-dark">CNS Rewards</h1>
        <ErrorState
          description="Informasi poin belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.account.loyalty} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const progress = tierProgress(account.lifetimePoints, programme.tiers);
  const { pointValue, maxRedeemPercent } = programme.settings;

  return (
    <div className="flex flex-col gap-10">
      <TrackEvent name="LOYALTY_VIEWED" />
      <h1 className="text-h1 text-brand-cocoa-dark">CNS Rewards</h1>

      <Card as="section" padding="lg" tone="surface" className="grid gap-6 tablet:grid-cols-2">
        <div>
          <p className="text-caption tracking-eyebrow text-text-secondary uppercase">Saldo poin</p>
          <p className="mt-2 font-display text-display-l text-brand-cocoa-dark">{account.balance.toLocaleString("id-ID")}</p>
          <p className="text-body-s text-text-secondary">
            Total poin yang pernah didapat: {points(account.lifetimePoints)}
            {pointValue > 0 && ` · 1 poin = ${formatIDR(pointValue)} saat checkout`}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-body-s font-medium">
            <Star aria-hidden className="size-4 text-ai-accent" />
            Tingkat {progress.current?.name ?? "—"}
          </p>
          {progress.next ? (
            <>
              <div
                role="progressbar"
                aria-label={`Menuju tingkat ${progress.next.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                className="h-2 overflow-hidden rounded-pill bg-secondary"
              >
                <div className="h-full bg-brand-cocoa" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="text-caption text-text-secondary">
                {points(progress.remaining)} lagi menuju {progress.next.name}
              </p>
            </>
          ) : (
            <p className="text-caption text-text-secondary">Kamu berada di tingkat tertinggi saat ini.</p>
          )}
          {progress.current && progress.current.benefits.length > 0 && (
            <ul className="list-disc pl-5 text-caption text-text-secondary">
              {progress.current.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <section aria-labelledby="earn-title" className="flex flex-col gap-3">
        <h2 id="earn-title" className="text-h3">
          Cara mendapatkan poin
        </h2>
        {programme.rules.length === 0 ? (
          <p className="text-body-s text-text-secondary">Program poin sedang disiapkan.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-body-s">
            {programme.rules.map((rule) => (
              <li key={rule.event} className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="font-medium">{eventLabel(rule.event)}</span>
                <span className="text-text-secondary">{describeRule(rule)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-caption text-text-secondary">
          Poin masuk setelah pembayaran pesanan dikonfirmasi.
          {maxRedeemPercent > 0 && ` Poin bisa dipakai saat checkout, maksimal ${maxRedeemPercent}% dari belanja.`}
        </p>
      </section>

      <section aria-labelledby="rewards-title" className="flex flex-col gap-4">
        <h2 id="rewards-title" className="text-h3">
          Tukar hadiah
        </h2>
        {programme.rewards.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<Gift className="size-8" strokeWidth={1.25} />}
            title="Belum ada hadiah"
            description="Hadiah untuk ditukar dengan poin akan tampil di sini. Sementara itu, poinmu bisa langsung dipakai saat checkout."
          />
        ) : (
          <ul className="grid gap-4 tablet:grid-cols-2">
            {programme.rewards.map((reward) => {
              const affordable = account.balance >= reward.pointsCost;
              return (
                <li key={reward.id}>
                  <Card padding="md" className="flex h-full flex-col gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{reward.name}</p>
                      {reward.description && <p className="mt-1 text-body-s text-text-secondary">{reward.description}</p>}
                      <p className="mt-2 text-body-s">{points(reward.pointsCost)}</p>
                    </div>
                    <RedeemButton
                      rewardId={reward.id}
                      rewardName={reward.name}
                      disabled={!reward.inStock || !affordable}
                      disabledLabel={!reward.inStock ? "Stok habis" : "Poin belum cukup"}
                    />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {redemptions && redemptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-h4">Voucher & hadiahku</h3>
            <ul className="flex flex-col gap-2 text-body-s">
              {redemptions.map((redemption) => (
                <li key={redemption.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                  <span>
                    {redemption.rewardName}
                    {redemption.couponCode && (
                      <span className="ml-2 rounded-sm bg-secondary px-2 py-0.5 font-medium tracking-wide select-all">{redemption.couponCode}</span>
                    )}
                  </span>
                  <span className="text-text-secondary">
                    {formatDate(redemption.createdAt)} · −{points(redemption.pointsSpent)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="text-h3">
          Riwayat poin
        </h2>
        {history === null ? (
          <p className="text-body-s text-text-secondary">Riwayat belum dapat dimuat.</p>
        ) : history.items.length === 0 ? (
          <p className="text-body-s text-text-secondary">Belum ada aktivitas poin. Poin pertamamu akan muncul setelah pesanan dibayar.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-body-s">
            {history.items.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 py-3">
                <span>
                  <span className="font-medium">{eventLabel(entry.event)}</span>
                  {entry.description && <span className="block text-caption text-text-secondary">{entry.description}</span>}
                  <span className="block text-caption text-text-secondary">{formatDate(entry.createdAt)}</span>
                </span>
                <span className={entry.points >= 0 ? "font-medium text-success" : "font-medium text-text-primary"}>
                  {entry.points >= 0 ? "+" : "−"}
                  {Math.abs(entry.points).toLocaleString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
