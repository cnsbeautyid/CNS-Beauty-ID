"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { setStockAction, type AdminActionResult } from "./actions";

/** Inline absolute stock setter for one product. */
export function StockForm({ productId, productName, stock }: { productId: string; productName: string; stock: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(String(stock));
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const outcome = await setStockAction({ productId, stock: value });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <div className="w-28">
          <Input
            id={`stock-${productId}`}
            label={`Stok ${productName}`}
            hideLabel
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" loading={pending} disabled={value === String(stock)}>
          Simpan
        </Button>
      </div>
      <p role="status" className={result?.ok === false ? "text-caption text-error" : "text-caption text-success"}>
        {result?.message}
      </p>
    </form>
  );
}
