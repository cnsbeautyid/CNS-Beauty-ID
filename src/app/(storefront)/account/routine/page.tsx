import { Moon, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { productPath, ROUTES } from "@/constants/routes";
import { RoutineBuilder } from "@/features/routine/routine-builder";
import { RemoveRoutineItemButton, RoutineCartButton } from "@/features/routine/routine-controls";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import { purchasableProductIds, type RoutineItemView } from "@/services/routine/model";
import { getBuilderOptions, getOwnRoutine } from "@/services/routine/routine";

export const metadata = { title: "Rutinitas" };

function RoutineList({ title, icon, items }: { title: string; icon: ReactNode; items: RoutineItemView[] }) {
  return (
    <section aria-label={`Rutinitas ${title.toLowerCase()}`} className="rounded-lg border border-border p-5">
      <h2 className="flex items-center gap-2 text-h4">
        <span aria-hidden className="text-brand-rose-gold">
          {icon}
        </span>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-body-s text-text-secondary">Belum ada langkah.</p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-border">
          {items.map((item, index) => {
            const label = item.product?.card.name ?? item.step?.name ?? "Langkah";
            return (
              <li key={`${item.id}-${title}`} className="flex gap-3 py-3">
                <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-pill border border-primary text-caption">
                  {index + 1}
                </span>
                <div className="flex-1 text-body-s">
                  <p className="font-medium">{item.step?.name ?? "Langkah lain"}</p>
                  {item.product ? (
                    <Link href={productPath(item.product.card.slug)} className="underline underline-offset-4">
                      {item.product.card.name}
                    </Link>
                  ) : (
                    <p className="text-text-secondary">{item.unavailable ? "Produk ini sudah tidak tersedia" : "Produk yang sudah kamu punya"}</p>
                  )}
                  {item.product?.card.availability === "out_of_stock" && <p className="text-caption text-text-secondary">Stok habis</p>}
                  {item.product?.howToUse && <p className="mt-1 text-caption text-text-secondary">Cara pakai: {item.product.howToUse}</p>}
                  {item.note && <p className="mt-1 text-caption text-text-secondary">Catatan: {item.note}</p>}
                </div>
                <RemoveRoutineItemButton itemId={item.id} label={label} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default async function AccountRoutinePage() {
  await requireUser(ROUTES.account.routine);
  const [routine, options] = await Promise.all([getOwnRoutine(), getBuilderOptions()]);

  if (routine === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-brand-cocoa-dark">Rutinitas</h1>
        <ErrorState
          description="Rutinitas belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.account.routine} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const empty = !routine || (routine.view.am.length === 0 && routine.view.pm.length === 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h1 text-brand-cocoa-dark">Rutinitas</h1>
        {routine && !empty && <p className="mt-2 text-body-s text-text-secondary">Terakhir diperbarui {formatDate(routine.updatedAt)}</p>}
      </div>

      {empty ? (
        <EmptyState
          icon={<Sparkles className="size-8" strokeWidth={1.25} />}
          title="Belum ada rutinitas"
          description="Ikuti Skin Quiz untuk rutinitas yang disarankan, atau susun sendiri langkah demi langkah di bawah."
          action={<ButtonLink href={ROUTES.skinQuiz}>Mulai Skin Quiz</ButtonLink>}
        />
      ) : (
        <>
          <div className="grid gap-4 wide:grid-cols-2">
            <RoutineList title="Pagi" icon={<Sun className="size-5" strokeWidth={1.5} />} items={routine!.view.am} />
            <RoutineList title="Malam" icon={<Moon className="size-5" strokeWidth={1.5} />} items={routine!.view.pm} />
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <RoutineCartButton productIds={purchasableProductIds(routine!.view)} />
            <AskAIButton variant="secondary" prefill="Bagaimana cara menjalankan rutinitas skincare saya dengan benar?">
              Tanya Beauty AI
            </AskAIButton>
          </div>
        </>
      )}

      {options ? (
        <RoutineBuilder options={options} />
      ) : (
        <p className="text-body-s text-text-secondary">Penyusun rutinitas belum dapat dimuat.</p>
      )}
      <p className="text-caption text-text-secondary">Rutinitas ini adalah panduan perawatan, bukan saran medis.</p>
    </div>
  );
}
