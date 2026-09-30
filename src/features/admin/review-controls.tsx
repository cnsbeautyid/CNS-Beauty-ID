"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { reviewContentAction, type AdminActionResult } from "./actions";

type ReviewControlsProps = { kind: "product_copy" | "benefit" | "faq"; id: string; status: string; evidenceReference: string | null };

/** Approve (with optional evidence reference) or return to draft. The DB trigger stamps the reviewer. */
export function ReviewControls({ kind, id, status, evidenceReference }: ReviewControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [evidence, setEvidence] = useState(evidenceReference ?? "");
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const decide = (decision: "approve" | "draft") =>
    startTransition(async () => {
      const outcome = await reviewContentAction({ kind, id, decision, evidenceReference: evidence });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      {status !== "approved" && (
        <Input
          id={`evidence-${kind}-${id}`}
          label="Referensi bukti (opsional)"
          hint="Mis. nomor uji lab, dokumen BPOM, atau sumber klaim."
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {status === "approved" ? (
          <Button size="sm" variant="ghost" onClick={() => decide("draft")} loading={pending}>
            Kembalikan ke draft
          </Button>
        ) : (
          <Button size="sm" onClick={() => decide("approve")} loading={pending}>
            Setujui untuk tampil
          </Button>
        )}
      </div>
      <p role="status" className={result?.ok === false ? "text-caption text-error" : "text-caption text-success"}>
        {result?.message}
      </p>
    </div>
  );
}
