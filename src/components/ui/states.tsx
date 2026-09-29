import { CircleAlert, LoaderCircle, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// The four required UI states (CLAUDE.md §15). Success is the component itself.

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-secondary", className)} />;
}

export function LoadingState({ label = "Memuat…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-3 py-12 text-body-s text-text-secondary", className)}>
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

type MessageStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: MessageStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span aria-hidden className="text-brand-rose-gold">
        {icon ?? <PackageOpen className="size-8" strokeWidth={1.25} />}
      </span>
      <p className="font-display text-h4 text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-body-s text-text-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kendala",
  description = "Maaf, konten ini belum dapat dimuat. Silakan coba lagi.",
  action,
  className,
}: Partial<MessageStateProps>) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <CircleAlert aria-hidden className="size-8 text-error" strokeWidth={1.25} />
      <p className="font-display text-h4 text-text-primary">{title}</p>
      <p className="max-w-sm text-body-s text-text-secondary">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
