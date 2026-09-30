"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BuilderOptions } from "@/services/routine/routine";

import { addRoutineItemAction, type RoutineActionResult } from "./actions";

const OWN_PRODUCT = "own";

/** Adds one step to the routine: a CNS product for that step, or the customer's own product. */
export function RoutineBuilder({ options }: { options: BuilderOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stepSlug, setStepSlug] = useState(options.steps[0]?.slug ?? "");
  const [productId, setProductId] = useState(OWN_PRODUCT);
  const [time, setTime] = useState<"am" | "pm" | "both">("both");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<RoutineActionResult | null>(null);

  const step = options.steps.find((candidate) => candidate.slug === stepSlug);
  const morningOnly = step?.time === "am";
  // Products assigned to this step first, then the rest of the catalog.
  const products = [...options.products].sort((a, b) => Number(b.stepSlug === stepSlug) - Number(a.stepSlug === stepSlug));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const outcome = await addRoutineItemAction({
        stepSlug,
        productId: productId === OWN_PRODUCT ? null : productId,
        time: morningOnly ? "am" : time,
        note,
      });
      setResult(outcome);
      if (outcome.ok) {
        setNote("");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-lg bg-surface p-6">
      <h2 className="text-h4">Tambah langkah</h2>
      <div className="grid gap-4 tablet:grid-cols-2">
        <Select
          id="routine-step"
          label="Langkah"
          value={stepSlug}
          onChange={(event) => {
            setStepSlug(event.target.value);
            setProductId(OWN_PRODUCT);
          }}
          options={options.steps.map((candidate) => ({ value: candidate.slug, label: candidate.name }))}
        />
        <Select
          id="routine-product"
          label="Produk"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          options={[{ value: OWN_PRODUCT, label: "Produk yang sudah saya punya" }, ...products.map((product) => ({ value: product.id, label: product.name }))]}
        />
      </div>
      {morningOnly ? (
        <p className="text-body-s text-text-secondary">{step?.name} dipakai di pagi hari.</p>
      ) : (
        <RadioGroup
          name="routine-time"
          legend="Waktu pemakaian"
          value={time}
          onChange={(value) => setTime(value as "am" | "pm" | "both")}
          options={[
            { value: "both", label: "Pagi dan malam" },
            { value: "am", label: "Pagi" },
            { value: "pm", label: "Malam" },
          ]}
        />
      )}
      <Input id="routine-note" label="Catatan (opsional)" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={pending} disabled={!stepSlug}>
          Tambahkan
        </Button>
        <p role="status" className={result?.ok === false ? "text-body-s text-error" : "text-body-s text-success"}>
          {result?.message}
        </p>
      </div>
    </form>
  );
}
