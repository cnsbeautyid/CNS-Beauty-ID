import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export function InsightError({ href }: { href: string }) {
  return (
    <ErrorState
      description="Ringkasan belum dapat dimuat."
      action={
        <ButtonLink href={href} variant="secondary">
          Coba lagi
        </ButtonLink>
      }
    />
  );
}
