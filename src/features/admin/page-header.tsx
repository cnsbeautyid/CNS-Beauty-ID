import type { ReactNode } from "react";

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-h2 text-brand-cocoa-dark">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-body-s text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
