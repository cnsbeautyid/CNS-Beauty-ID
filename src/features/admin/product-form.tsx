"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { productUpdateSchema, type ProductUpdateInput, type ProductUpdateValues } from "@/services/admin/model";

import { updateProductAction, type AdminActionResult } from "./actions";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft (tidak tampil)" },
  { value: "active", label: "Aktif (tampil di toko)" },
  { value: "archived", label: "Diarsipkan" },
];

export function ProductForm({ defaults }: { defaults: ProductUpdateValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductUpdateValues, unknown, ProductUpdateInput>({ resolver: zodResolver(productUpdateSchema), defaultValues: defaults });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const outcome = await updateProductAction(values);
      setResult(outcome);
      if (outcome.ok) router.refresh();
    }),
  );

  const serverError = (field: string) => result?.fieldErrors?.[field];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <input type="hidden" {...register("productId")} />
      <div className="grid gap-4 tablet:grid-cols-2">
        <Input id="product-price" label="Harga jual (Rp)" type="number" inputMode="numeric" min={1} required error={errors.price?.message ?? serverError("price")} {...register("price")} />
        <Input
          id="product-compare"
          label="Harga coret (Rp, opsional)"
          type="number"
          inputMode="numeric"
          min={0}
          hint="Kosongkan jika tidak ada."
          error={errors.comparePrice?.message ?? serverError("comparePrice")}
          {...register("comparePrice")}
        />
        <Input id="product-stock" label="Stok" type="number" inputMode="numeric" min={0} required error={errors.stock?.message ?? serverError("stock")} {...register("stock")} />
        <Input
          id="product-low"
          label="Batas stok menipis"
          type="number"
          inputMode="numeric"
          min={0}
          error={errors.lowStockThreshold?.message ?? serverError("lowStockThreshold")}
          {...register("lowStockThreshold")}
        />
        <Select id="product-status" label="Status" options={STATUS_OPTIONS} error={errors.status?.message} {...register("status")} />
      </div>
      <Checkbox id="product-featured" label="Tampilkan sebagai produk unggulan" {...register("isFeatured")} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={pending}>
          Simpan produk
        </Button>
        <p role="status" className={result?.ok === false ? "text-body-s text-error" : "text-body-s text-success"}>
          {result?.message}
        </p>
      </div>
    </form>
  );
}
