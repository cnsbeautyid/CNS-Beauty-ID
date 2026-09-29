import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SectionHeaderProps = {
  /** id for the h2, so the parent <section> can use aria-labelledby. */
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  align?: "center" | "start";
  action?: ReactNode;
};

export function SectionHeader({ id, title, eyebrow, description, align = "center", action }: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        centered ? "items-center text-center" : "items-start tablet:flex-row tablet:items-end tablet:justify-between",
      )}
    >
      <div className={cn("flex flex-col gap-3", centered && "items-center")}>
        {eyebrow && (
          <p className="flex items-center gap-3 text-caption tracking-eyebrow text-brand-cocoa uppercase">
            <span aria-hidden className="h-px w-8 bg-brand-gold" />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="text-h2 text-text-primary">
          {title}
        </h2>
        {description && <p className="max-w-2xl text-body-l text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
