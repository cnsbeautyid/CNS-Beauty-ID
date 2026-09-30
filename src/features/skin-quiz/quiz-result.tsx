"use client";

import { CircleAlert, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { ProductCard } from "@/components/product/product-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { productPath, ROUTES } from "@/constants/routes";
import { useSetCartCount } from "@/features/cart/cart-query";
import { formatIDR } from "@/lib/utils/format";
import type { QuizResult } from "@/services/quiz/quiz";
import type { QuizAnswers } from "@/services/quiz/schema";
import { useQuizStore } from "@/stores/quiz-store";

import { saveQuizRoutineAction } from "@/features/routine/actions";

import { addRoutineToCartAction, saveSkinProfileAction } from "./actions";

function RoutineColumn({ title, entries }: { title: string; entries: QuizResult["routine"]["am"] }) {
  return (
    <div className="rounded-lg bg-surface p-5">
      <h3 className="text-h4">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-body-s text-text-secondary">Belum ada langkah yang bisa disarankan.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {entries.map((entry, index) => (
            <li key={entry.step.slug} className="flex gap-3 text-body-s">
              <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-pill border border-primary text-caption">
                {index + 1}
              </span>
              <span>
                <span className="font-medium">{entry.step.name}</span>
                <span className="block text-text-secondary">
                  {entry.product ? (
                    <Link href={productPath(entry.product.card.slug)} className="underline underline-offset-4">
                      {entry.product.card.name}
                    </Link>
                  ) : (
                    "Lanjutkan dengan produk yang sudah kamu pakai"
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function QuizResultView({ result, answers }: { result: QuizResult; answers: QuizAnswers }) {
  const router = useRouter();
  const pathname = usePathname();
  const { saved, markSaved, reset } = useQuizStore();
  const setCartCount = useSetCartCount();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string; cart?: boolean; routine?: boolean }>();

  const availableIds = result.products.filter((product) => product.card.availability !== "out_of_stock").map((product) => product.id);
  const { profile } = result;

  const addRoutine = () =>
    startTransition(async () => {
      const outcome = await addRoutineToCartAction(availableIds);
      if (!outcome.ok) return setMessage({ ok: false, text: outcome.message });
      setCartCount(outcome.count);
      setMessage({ ok: true, cart: true, text: `${outcome.added} produk ditambahkan ke keranjang.${outcome.skipped ? ` ${outcome.skipped} produk sedang tidak tersedia.` : ""}` });
    });

  const save = () =>
    startTransition(async () => {
      const outcome = await saveSkinProfileAction(answers);
      if (outcome.ok) {
        markSaved();
        return setMessage({ ok: true, text: "Profil kulit tersimpan di akunmu." });
      }
      if (outcome.code === "unauthenticated") return router.push(`${ROUTES.signIn}?next=${encodeURIComponent(pathname)}`);
      setMessage({ ok: false, text: outcome.message });
    });

  const saveRoutine = () =>
    startTransition(async () => {
      const outcome = await saveQuizRoutineAction(answers);
      if (outcome.ok) return setMessage({ ok: true, text: outcome.message, routine: true });
      if (outcome.code === "unauthenticated") return router.push(`${ROUTES.signIn}?next=${encodeURIComponent(pathname)}`);
      setMessage({ ok: false, text: outcome.message });
    });

  const prompt = `Kulit saya ${profile.skinType ?? "belum pasti jenisnya"}, kebutuhan utama ${profile.concerns.join(", ")}. Bagaimana cara memulai rutinitas yang tepat?`;

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="quiz-result-title" className="flex flex-col gap-5">
        <h2 id="quiz-result-title" tabIndex={-1} className="font-display text-h2 text-brand-cocoa-dark">
          Profil kulitmu
        </h2>
        <dl className="grid gap-4 rounded-lg border border-border p-5 tablet:grid-cols-2 desktop:grid-cols-4">
          {[
            ["Jenis kulit", profile.skinType ?? "Belum yakin"],
            ["Kebutuhan utama", profile.concerns.join(", ")],
            ["Sensitivitas", profile.sensitivity],
            ["Budget per produk", profile.budget ? `Hingga ${formatIDR(profile.budget)}` : "Fleksibel"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-caption text-text-secondary">{label}</dt>
              <dd className="mt-1 text-body-s font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {result.notes.length > 0 && (
          <div className="rounded-lg bg-ai-surface p-5">
            <p className="flex items-center gap-2 text-body-s font-medium">
              <CircleAlert aria-hidden className="size-4 text-ai-accent" />
              Perlu diperhatikan
            </p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-body-s text-text-secondary">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="quiz-products-title" className="flex flex-col gap-5">
        <h2 id="quiz-products-title" className="text-h3">
          Produk yang direkomendasikan
        </h2>
        {result.products.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-8" strokeWidth={1.25} />}
            title="Belum ada produk yang sesuai"
            description="Katalog kami belum memiliki produk untuk kebutuhan ini. Tanyakan pilihan lain kepada CNS Beauty AI atau tim kami."
            action={<AskAIButton prefill={prompt}>Tanya Beauty AI</AskAIButton>}
          />
        ) : (
          <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-10 desktop:grid-cols-4">
            {result.products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product.card}
                  actions={
                    <p className="text-caption text-text-secondary">
                      Termasuk kebutuhan: {product.matchedConcerns.join(", ")}
                      {product.overBudget && <span className="block text-warning">Di atas budget-mu</span>}
                    </p>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {result.products.length > 0 && (
        <section aria-labelledby="quiz-routine-title" className="flex flex-col gap-5">
          <h2 id="quiz-routine-title" className="text-h3">
            Rutinitas yang disarankan
          </h2>
          <div className="grid gap-4 tablet:grid-cols-2">
            <RoutineColumn title="Pagi" entries={result.routine.am} />
            <RoutineColumn title="Malam" entries={result.routine.pm} />
          </div>
        </section>
      )}

      <section aria-label="Langkah berikutnya" className="flex flex-col gap-4 border-t border-border pt-8">
        <div className="flex flex-wrap gap-3">
          {result.products.length > 0 && (
            <Button onClick={addRoutine} loading={pending} disabled={availableIds.length === 0} leadingIcon={<ShoppingBag aria-hidden className="size-4" />}>
              {availableIds.length === 0 ? "Produk sedang tidak tersedia" : "Tambahkan rutinitas ke keranjang"}
            </Button>
          )}
          {saved ? (
            <ButtonLink href={ROUTES.account.skinProfile} variant="secondary">
              Lihat profil kulit di akun
            </ButtonLink>
          ) : (
            <Button variant="secondary" onClick={save} loading={pending}>
              Simpan profil kulit
            </Button>
          )}
          {result.products.length > 0 && (
            <Button variant="secondary" onClick={saveRoutine} loading={pending}>
              Simpan sebagai rutinitas saya
            </Button>
          )}
          <AskAIButton variant="ghost" prefill={prompt}>
            Tanya Beauty AI
          </AskAIButton>
          <Button variant="ghost" onClick={reset}>
            Ulangi quiz
          </Button>
        </div>
        <p role="status" className={message?.ok === false ? "text-body-s text-error" : "text-body-s text-success"}>
          {message?.text}{" "}
          {message?.routine && (
            <Link href={ROUTES.account.routine} className="font-medium text-text-primary underline underline-offset-4">
              Lihat rutinitas
            </Link>
          )}
          {message?.cart && (
            <Link href={ROUTES.cart} className="font-medium text-text-primary underline underline-offset-4">
              Lihat keranjang
            </Link>
          )}
        </p>
      </section>
    </div>
  );
}
