import { Handshake } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";

/** Shown instead of portal content when the caller isn't an active partner, or the check failed. */
export function PartnerGateNotice({ status, retryHref }: { status: "not_partner" | "error"; retryHref: string }) {
  if (status === "error") {
    return (
      <ErrorState
        description="Data partner belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
        action={
          <ButtonLink href={retryHref} variant="secondary">
            Coba lagi
          </ButtonLink>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={<Handshake className="size-8" strokeWidth={1.25} />}
      title="Portal khusus partner"
      description="Portal ini tersedia untuk reseller dan dropshipper CNS Beauty yang sudah disetujui."
      action={<ButtonLink href={ROUTES.resellerProgram}>Daftar jadi partner</ButtonLink>}
    />
  );
}
