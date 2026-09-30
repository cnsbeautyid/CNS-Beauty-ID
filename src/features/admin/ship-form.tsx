"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { shipOrderAction, type AdminActionResult } from "./actions";

export function ShipForm({ orderId, courier }: { orderId: string; courier: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState({ courier: courier ?? "", trackingNumber: "" });
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const outcome = await shipOrderAction({ orderId, ...values });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 tablet:grid-cols-2">
        <Input
          id="ship-courier"
          label="Kurir"
          required
          value={values.courier}
          onChange={(event) => setValues((current) => ({ ...current, courier: event.target.value }))}
          error={result?.fieldErrors?.courier}
        />
        <Input
          id="ship-tracking"
          label="Nomor resi"
          required
          value={values.trackingNumber}
          onChange={(event) => setValues((current) => ({ ...current, trackingNumber: event.target.value }))}
          error={result?.fieldErrors?.trackingNumber}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" loading={pending}>
          Tandai dikirim
        </Button>
        <p role="status" className={result?.ok === false ? "text-caption text-error" : "text-caption text-success"}>
          {result?.message}
        </p>
      </div>
    </form>
  );
}
