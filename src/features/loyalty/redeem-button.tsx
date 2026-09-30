"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { redeemRewardAction, type RedeemResult } from "./actions";

export function RedeemButton({ rewardId, rewardName, disabled, disabledLabel }: { rewardId: string; rewardName: string; disabled: boolean; disabledLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  const redeem = () =>
    startTransition(async () => {
      const outcome = await redeemRewardAction(rewardId);
      setResult(outcome);
      setConfirming(false);
      if (outcome.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={redeem} loading={pending}>
            Ya, tukar poin
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Batal
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setConfirming(true)}>
          {disabled ? disabledLabel : "Tukar"}
          <span className="sr-only"> {rewardName}</span>
        </Button>
      )}
      <p role="status" className={result?.ok === false ? "text-caption text-error" : "text-caption text-success"}>
        {result?.message}
      </p>
    </div>
  );
}
