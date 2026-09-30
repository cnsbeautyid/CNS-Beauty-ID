"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { profileSchema, type ProfileValues } from "@/services/account/schemas";

import { updateProfileAction, type AccountActionResult } from "./actions";

export function ProfileForm({ defaults, email }: { defaults: ProfileValues; email: string | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AccountActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues, unknown, z.output<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: defaults });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setResult(await updateProfileAction(values));
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 tablet:grid-cols-2">
        <Input id="profile-name" label="Nama lengkap" autoComplete="name" required error={errors.fullName?.message} {...register("fullName")} />
        <Input id="profile-email" label="Email" type="email" value={email ?? ""} readOnly disabled hint="Email akun tidak dapat diubah di sini." />
        <Input id="profile-phone" label="Nomor HP" type="tel" inputMode="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
        <Input id="profile-whatsapp" label="Nomor WhatsApp" type="tel" inputMode="tel" error={errors.whatsapp?.message} {...register("whatsapp")} />
        <Input id="profile-birth" label="Tanggal lahir" type="date" autoComplete="bday" error={errors.birthDate?.message} {...register("birthDate")} />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-body-s font-medium">Preferensi komunikasi</legend>
        <Checkbox id="profile-marketing" label="Kirimi saya info produk dan promo melalui email" {...register("marketingOptIn")} />
        <Checkbox id="profile-wa" label="Kirimi saya info produk dan promo melalui WhatsApp" {...register("whatsappOptIn")} />
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={pending}>
          Simpan profil
        </Button>
        <p role="status" className={result?.ok === false ? "text-body-s text-error" : "text-body-s text-success"}>
          {result?.message}
        </p>
      </div>
    </form>
  );
}
