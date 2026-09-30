"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { decideApplicationAction, updatePartnerAction, type AdminActionResult } from "./actions";

const LEVELS = [1, 2, 3, 4].map((level) => ({ value: String(level), label: `Level ${level}` }));

function Status({ result }: { result: AdminActionResult | null }) {
  return (
    <p role="status" className={result?.ok === false ? "text-caption text-error" : "text-caption text-success"}>
      {result?.message}
    </p>
  );
}

/** Approve a pending application at a level (resellers) or reject it. */
export function ApplicationDecision({ applicationId, memberType, desiredLevel, storeName }: { applicationId: string; memberType: "reseller" | "dropshipper"; desiredLevel: number; storeName: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [level, setLevel] = useState(String(desiredLevel));
  const [store, setStore] = useState(storeName ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const decide = (decision: "approve" | "reject") =>
    startTransition(async () => {
      const outcome = await decideApplicationAction(
        decision === "approve" ? { applicationId, decision, tierLevel: memberType === "dropshipper" ? 1 : level, storeName: store } : { applicationId, decision },
      );
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 tablet:grid-cols-2">
        {memberType === "reseller" && (
          <Select id={`level-${applicationId}`} label="Level partner" options={LEVELS} value={level} onChange={(event) => setLevel(event.target.value)} />
        )}
        <Input id={`store-${applicationId}`} label="Nama toko" value={store} onChange={(event) => setStore(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => decide("approve")} loading={pending && !rejecting}>
          Setujui
        </Button>
        {rejecting ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => decide("reject")} loading={pending}>
              Ya, tolak
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>
              Batal
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setRejecting(true)} disabled={pending}>
            Tolak
          </Button>
        )}
      </div>
      <Status result={result} />
    </div>
  );
}

/** Level and active switch for an approved partner. */
export function PartnerControls({ userId, memberType, tierLevel, isActive }: { userId: string; memberType: "reseller" | "dropshipper"; tierLevel: number; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [level, setLevel] = useState(String(tierLevel));
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const save = (next: { isActive: boolean; tierLevel: string }) =>
    startTransition(async () => {
      const outcome = await updatePartnerAction({ userId, ...next });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        {memberType === "reseller" && (
          <>
            <div className="w-36">
              <Select id={`partner-level-${userId}`} label="Level" options={LEVELS} value={level} onChange={(event) => setLevel(event.target.value)} />
            </div>
            <Button size="sm" variant="secondary" onClick={() => save({ isActive, tierLevel: level })} loading={pending} disabled={level === String(tierLevel)}>
              Simpan level
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => save({ isActive: !isActive, tierLevel: String(tierLevel) })} disabled={pending}>
          {isActive ? "Nonaktifkan" : "Aktifkan kembali"}
        </Button>
      </div>
      <Status result={result} />
    </div>
  );
}
