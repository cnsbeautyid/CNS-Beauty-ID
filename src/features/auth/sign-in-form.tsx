"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInSchema, type SignInValues } from "@/services/auth/schemas";

import { signInAction, type AuthFormResult } from "./actions";

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthFormResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues, unknown, z.output<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setResult(await signInAction(values, next));
    }),
  );

  const message = result?.status === "error" ? result.message : notice;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {message && (
        <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-body-s text-error">
          {message}
        </p>
      )}
      <Input id="signin-email" type="email" label="Email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
      <Input
        id="signin-password"
        type="password"
        label="Kata sandi"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Masuk
      </Button>
    </form>
  );
}
