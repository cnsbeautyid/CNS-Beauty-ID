"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { formatIDR } from "@/lib/utils/format";
import { checkoutSchema, type CheckoutValues, type ShippingDetails } from "@/services/checkout/schema";

import { placeOrderAction, type CheckoutActionResult } from "./actions";

type SavedAddressOption = ShippingDetails & { id: string; label: string | null };

type CheckoutFormProps = {
  total: number;
  defaultShipping: ShippingDetails;
  savedAddresses: SavedAddressOption[];
  shippingNote: string;
  coupon: { code: string; description: string | null } | null;
  expiryHours: number;
};

const FIELDS: { name: keyof ShippingDetails; label: string; autoComplete: string; type?: string; inputMode?: "numeric" | "tel" }[] = [
  { name: "recipientName", label: "Nama penerima", autoComplete: "name" },
  { name: "phone", label: "Nomor HP / WhatsApp", autoComplete: "tel", type: "tel", inputMode: "tel" },
  { name: "addressLine", label: "Alamat lengkap", autoComplete: "street-address" },
  { name: "district", label: "Kecamatan", autoComplete: "address-level3" },
  { name: "city", label: "Kota / Kabupaten", autoComplete: "address-level2" },
  { name: "province", label: "Provinsi", autoComplete: "address-level1" },
  { name: "postalCode", label: "Kode pos", autoComplete: "postal-code", inputMode: "numeric" },
];

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  const id = `checkout-step-${number}`;
  return (
    <section aria-labelledby={id} className="border-b border-border pb-8">
      <h2 id={id} className="flex items-center gap-3 text-h4">
        <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-pill border border-primary text-caption font-medium">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Linear checkout (PRD §21): address → shipping → voucher → payment → confirmation. */
export function CheckoutForm({ total, defaultShipping, savedAddresses, shippingNote, coupon, expiryHours }: CheckoutFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<CheckoutActionResult | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<CheckoutValues, unknown, z.output<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { shipping: defaultShipping, notes: "", saveAddress: savedAddresses.length === 0, expectedTotal: total },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      // The total shown right now (it updates after a refresh on conflict).
      const result = await placeOrderAction({ ...values, expectedTotal: total });
      setFailure(result);
      if (result.code === "checkout_conflict") router.refresh();
    }),
  );

  // Move focus to the error so keyboard and screen-reader users hear it.
  useEffect(() => {
    if (failure) alertRef.current?.focus();
  }, [failure]);

  const applyAddress = (address: SavedAddressOption) =>
    reset({ ...getValues(), shipping: { ...address }, saveAddress: false });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      {failure && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-body-s text-error">
          <p>{failure.message}</p>
          {failure.code === "unauthenticated" && (
            <Link href={`${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.checkout)}`} className="mt-1 inline-block font-medium underline underline-offset-4">
              Masuk kembali
            </Link>
          )}
          {(failure.code === "rejected" || failure.code === "inventory_unavailable" || failure.code === "empty") && (
            <Link href={ROUTES.cart} className="mt-1 inline-block font-medium underline underline-offset-4">
              Kembali ke keranjang
            </Link>
          )}
        </div>
      )}

      <Step number={1} title="Alamat Pengiriman">
        {savedAddresses.length > 0 && (
          <div className="mb-5 flex flex-col gap-2">
            <p className="text-body-s text-text-secondary">Alamat tersimpan</p>
            <ul className="flex flex-col gap-2">
              {savedAddresses.map((address) => (
                <li key={address.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-body-s">
                  <span>
                    <span className="font-medium">{address.label ?? address.recipientName}</span>
                    <span className="block text-text-secondary">
                      {address.addressLine}, {address.district}, {address.city}
                    </span>
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => applyAddress(address)}>
                    Gunakan
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-4 tablet:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.name} className={field.name === "addressLine" ? "tablet:col-span-2" : undefined}>
              <Input
                id={`shipping-${field.name}`}
                label={field.label}
                type={field.type ?? "text"}
                inputMode={field.inputMode}
                autoComplete={`shipping ${field.autoComplete}`}
                required
                error={errors.shipping?.[field.name]?.message}
                {...register(`shipping.${field.name}`)}
              />
            </div>
          ))}
        </div>
        <Checkbox id="save-address" label="Simpan alamat ini untuk pesanan berikutnya" className="mt-4" {...register("saveAddress")} />
      </Step>

      <Step number={2} title="Pengiriman">
        <p className="text-body-s text-text-secondary">{shippingNote}</p>
      </Step>

      <Step number={3} title="Voucher">
        {coupon ? (
          <p className="text-body-s">
            Kupon <span className="font-medium">{coupon.code}</span> diterapkan
            {coupon.description && <span className="text-text-secondary"> — {coupon.description}</span>}.
          </p>
        ) : (
          <p className="text-body-s text-text-secondary">
            Tidak ada kupon.{" "}
            <Link href={ROUTES.cart} className="font-medium text-text-primary underline underline-offset-4">
              Tambahkan di keranjang
            </Link>
          </p>
        )}
      </Step>

      <Step number={4} title="Pembayaran">
        <div className="rounded-md border border-primary p-4">
          <p className="font-medium">Transfer bank (manual)</p>
          <p className="mt-1 text-body-s text-text-secondary">
            Nomor rekening dan instruksi pembayaran tampil setelah pesanan dibuat. Selesaikan pembayaran dalam {expiryHours} jam, lalu
            unggah bukti transfer.
          </p>
        </div>
      </Step>

      <Step number={5} title="Konfirmasi">
        <Textarea id="order-notes" label="Catatan untuk tim kami (opsional)" rows={3} maxLength={500} error={errors.notes?.message} {...register("notes")} />
        <div className="mt-6 flex flex-col gap-3">
          <p className="flex justify-between text-body font-medium">
            <span>Total pembayaran</span>
            <span>{formatIDR(total)}</span>
          </p>
          <Button type="submit" size="lg" fullWidth loading={pending}>
            Buat Pesanan
          </Button>
          <p className="text-caption text-text-secondary">Stok dan total dihitung ulang oleh sistem saat pesanan dibuat.</p>
        </div>
      </Step>
    </form>
  );
}
