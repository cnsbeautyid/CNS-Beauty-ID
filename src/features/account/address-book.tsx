"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addressSchema, type AddressValues } from "@/services/account/schemas";
import type { SavedAddress } from "@/services/checkout/addresses";

import { addAddressAction, deleteAddressAction, setDefaultAddressAction, type AccountActionResult } from "./actions";

const FIELDS: { name: keyof AddressValues; label: string; autoComplete: string; wide?: boolean; optional?: boolean }[] = [
  { name: "label", label: "Label (mis. Rumah, Kantor)", autoComplete: "off", optional: true },
  { name: "recipientName", label: "Nama penerima", autoComplete: "name" },
  { name: "phone", label: "Nomor HP", autoComplete: "tel" },
  { name: "addressLine", label: "Alamat lengkap", autoComplete: "street-address", wide: true },
  { name: "district", label: "Kecamatan", autoComplete: "address-level3" },
  { name: "city", label: "Kota / Kabupaten", autoComplete: "address-level2" },
  { name: "province", label: "Provinsi", autoComplete: "address-level1" },
  { name: "postalCode", label: "Kode pos", autoComplete: "postal-code" },
];

const EMPTY: AddressValues = { label: "", recipientName: "", phone: "", addressLine: "", district: "", city: "", province: "", postalCode: "" };

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AccountActionResult | null>(null);
  const [adding, setAdding] = useState(addresses.length === 0);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressValues, unknown, z.output<typeof addressSchema>>({ resolver: zodResolver(addressSchema), defaultValues: EMPTY });

  const run = (action: () => Promise<AccountActionResult>, after?: () => void) =>
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) {
        after?.();
        router.refresh();
      }
    });

  const onSubmit = handleSubmit((values) =>
    run(
      () => addAddressAction(values),
      () => {
        reset(EMPTY);
        setAdding(false);
      },
    ),
  );

  return (
    <div className="flex flex-col gap-5">
      {addresses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) => (
            <li key={address.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-4 text-body-s">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {address.label ?? address.recipientName}
                  {address.isDefault && <Badge tone="brand">Utama</Badge>}
                </p>
                <p className="text-text-secondary">
                  {address.recipientName} · {address.phone}
                  <br />
                  {address.addressLine}, {address.district}, {address.city}, {address.province} {address.postalCode}
                </p>
              </div>
              <div className="flex gap-3">
                {!address.isDefault && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setDefaultAddressAction(address.id))}
                    className="min-h-11 font-medium underline underline-offset-4 disabled:opacity-50"
                  >
                    Jadikan utama
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteAddressAction(address.id))}
                  className="min-h-11 font-medium text-error underline underline-offset-4 disabled:opacity-50"
                >
                  Hapus<span className="sr-only"> alamat {address.label ?? address.recipientName}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p role="status" className={result?.ok === false ? "text-body-s text-error" : "text-body-s text-success"}>
        {result?.message}
      </p>

      {adding ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-lg bg-surface p-5">
          <p className="font-medium">Alamat baru</p>
          <div className="grid gap-4 tablet:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.name} className={field.wide ? "tablet:col-span-2" : undefined}>
                <Input
                  id={`address-${field.name}`}
                  label={field.label}
                  autoComplete={field.autoComplete}
                  required={!field.optional}
                  error={errors[field.name]?.message}
                  {...register(field.name)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={pending}>
              Simpan alamat
            </Button>
            {addresses.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Batal
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            Tambah alamat
          </Button>
        </div>
      )}
    </div>
  );
}
