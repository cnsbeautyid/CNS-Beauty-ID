"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpSchema, type SignUpValues } from "@/services/auth/schemas";

import { signUpAction, type AuthFormResult } from "./actions";

export function SignUpForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthFormResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setResult(await signUpAction(values, next));
    }),
  );

  if (result?.status === "check_email") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-lg bg-surface p-6">
        <MailCheck aria-hidden className="size-7 text-success" strokeWidth={1.5} />
        <p className="font-display text-h4">Cek emailmu</p>
        <p className="text-body-s text-text-secondary">
          Kami mengirim tautan konfirmasi ke <strong className="font-medium text-text-primary">{result.email}</strong>. Buka
          tautan tersebut untuk mengaktifkan akun, lalu lanjutkan belanja.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result?.status === "error" && (
        <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-body-s text-error">
          {result.message}
        </p>
      )}
      <Input id="signup-name" label="Nama lengkap" autoComplete="name" required error={errors.fullName?.message} {...register("fullName")} />
      <Input id="signup-email" type="email" label="Email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
      <Input
        id="signup-password"
        type="password"
        label="Kata sandi"
        hint="Minimal 8 karakter."
        autoComplete="new-password"
        required
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Daftar
      </Button>
    </form>
  );
}
