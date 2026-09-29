import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Page-width wrapper with responsive gutters. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 tablet:px-6 desktop:px-8", className)}>{children}</div>;
}
