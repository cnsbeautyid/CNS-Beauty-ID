"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

import { recordPaymentProofAction } from "./actions";

// Mirrors the bucket limits (5 MB, images/PDF); the bucket enforces them too.
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const BUCKET = "payment-proofs";

export function ProofUpload({ orderId, userId }: { orderId: string; userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("proof");
    if (!(file instanceof File) || file.size === 0) return setError("Pilih file bukti transfer.");
    const extension = TYPES[file.type];
    if (!extension) return setError("Format file harus JPG, PNG, WEBP, atau PDF.");
    if (file.size > MAX_BYTES) return setError("Ukuran file maksimal 5 MB.");
    setError(undefined);

    startTransition(async () => {
      const { error: uploadError } = await createClient()
        .storage.from(BUCKET)
        .upload(`${userId}/${orderId}/${Date.now()}.${extension}`, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError("Bukti pembayaran belum dapat diunggah. Silakan coba lagi.");
        return;
      }
      const result = await recordPaymentProofAction(orderId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone(true);
      router.refresh();
    });
  };

  if (done) {
    return (
      <p role="status" className="text-body-s text-success">
        Terima kasih! Bukti pembayaran diterima dan akan diverifikasi tim kami.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <FieldLabel htmlFor="payment-proof">Unggah bukti transfer</FieldLabel>
      <input
        id="payment-proof"
        name="proof"
        type="file"
        accept={Object.keys(TYPES).join(",")}
        aria-describedby={error ? "payment-proof-hint payment-proof-error" : "payment-proof-hint"}
        aria-invalid={error ? true : undefined}
        className="block w-full text-body-s text-text-secondary file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-primary file:bg-background file:px-4 file:text-body-s file:font-medium file:text-text-primary"
      />
      <FieldHint id="payment-proof">JPG, PNG, WEBP, atau PDF, maksimal 5 MB.</FieldHint>
      {error && <FieldError id="payment-proof">{error}</FieldError>}
      <Button type="submit" variant="secondary" loading={pending} leadingIcon={<Upload aria-hidden className="size-4" />}>
        Kirim bukti pembayaran
      </Button>
    </form>
  );
}
