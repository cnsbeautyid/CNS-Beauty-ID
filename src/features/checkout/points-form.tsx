import { Star } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { formatIDR } from "@/lib/utils/format";

type PointsFormProps = { balance: number; requested: number; applied: number; pointValue: number; maxPercent: number };

/**
 * CNS Rewards at checkout. A plain GET form that sets ?poin= (URL state); the
 * server re-quotes, and quote_cart decides how many points actually apply.
 */
export function PointsForm({ balance, requested, applied, pointValue, maxPercent }: PointsFormProps) {
  return (
    <section aria-labelledby="points-title" className="mb-8 rounded-lg border border-border p-5">
      <h2 id="points-title" className="flex items-center gap-2 text-h4">
        <Star aria-hidden className="size-4 text-ai-accent" />
        Pakai poin CNS Rewards
      </h2>
      <p className="mt-1 text-body-s text-text-secondary">
        Saldo {balance.toLocaleString("id-ID")} poin · 1 poin = {formatIDR(pointValue)}
        {maxPercent > 0 && ` · maksimal ${maxPercent}% dari belanja`}
      </p>
      <Form action={ROUTES.checkout} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Input id="checkout-points" name="poin" type="number" inputMode="numeric" min={1} max={balance} label="Jumlah poin" defaultValue={requested || balance} />
        </div>
        <Button type="submit" variant="secondary">
          Pakai poin
        </Button>
        {requested > 0 && (
          <Link href={ROUTES.checkout} className="inline-flex min-h-11 items-center text-body-s font-medium underline underline-offset-4">
            Batal pakai poin
          </Link>
        )}
      </Form>
      {requested > 0 && (
        <p role="status" className="mt-3 text-body-s text-success">
          {applied > 0 ? `${applied.toLocaleString("id-ID")} poin dipakai (− ${formatIDR(applied * pointValue)}).` : "Poin belum bisa dipakai untuk pesanan ini."}
          {applied > 0 && applied < requested && ` Hanya ${applied.toLocaleString("id-ID")} poin yang bisa dipakai untuk pesanan ini.`}
        </p>
      )}
    </section>
  );
}
