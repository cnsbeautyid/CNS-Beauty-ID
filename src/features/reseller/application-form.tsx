"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applicationSchema, type ApplicationInput, type ApplicationValues } from "@/services/reseller/model";

import { submitApplicationAction, type ApplicationResult } from "./actions";

const TYPE_OPTIONS = [
  { value: "reseller", label: "Reseller", hint: "Beli stok dengan harga partner, lalu jual sendiri." },
  { value: "dropshipper", label: "Dropshipper", hint: "Jual tanpa stok; pesanan dikirim langsung ke pembelimu." },
] as const;

const LEVEL_OPTIONS = [1, 2, 3, 4].map((level) => ({ value: String(level), label: `Level ${level}` }));

export function ApplicationForm({ defaultName }: { defaultName?: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ApplicationValues, unknown, ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { memberType: "reseller", desiredLevel: 1, fullName: defaultName ?? "" },
  });
  const memberType = useWatch({ control, name: "memberType" });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setResult(await submitApplicationAction(values));
    }),
  );

  if (result?.ok) {
    return (
      <p role="status" className="rounded-md bg-surface p-5 text-body text-success">
        {result.message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <RadioGroup
        name="memberType"
        legend="Jenis kemitraan"
        options={TYPE_OPTIONS}
        value={memberType}
        onChange={(value) => setValue("memberType", value as ApplicationValues["memberType"], { shouldValidate: true })}
        error={errors.memberType?.message}
      />
      {memberType === "reseller" && (
        <Select
          id="apply-level"
          label="Level yang diminati"
          hint="Level menentukan minimal pembelian dan harga partner. Tim kami akan mengonfirmasi level yang sesuai."
          options={LEVEL_OPTIONS}
          error={errors.desiredLevel?.message}
          {...register("desiredLevel")}
        />
      )}
      <div className="grid gap-4 tablet:grid-cols-2">
        <Input id="apply-name" label="Nama lengkap" autoComplete="name" required error={errors.fullName?.message} {...register("fullName")} />
        <Input id="apply-phone" label="Nomor HP / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" required error={errors.phone?.message} {...register("phone")} />
        <Input id="apply-city" label="Kota" autoComplete="address-level2" required error={errors.city?.message} {...register("city")} />
        <Input id="apply-store" label="Nama toko (opsional)" error={errors.storeName?.message} {...register("storeName")} />
      </div>
      <Input
        id="apply-channel"
        label="Di mana kamu akan berjualan?"
        hint="Contoh: Instagram, Shopee, WhatsApp, toko fisik."
        required
        error={errors.salesChannel?.message}
        {...register("salesChannel")}
      />
      <Textarea id="apply-message" label="Pesan (opsional)" rows={3} error={errors.message?.message} {...register("message")} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={pending}>
          Kirim pendaftaran
        </Button>
        <p role="status" className="text-body-s text-error">
          {result?.message}
        </p>
      </div>
    </form>
  );
}
