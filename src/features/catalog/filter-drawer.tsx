"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";

/**
 * Mobile/tablet filter sheet. The panel itself is server-rendered and passed
 * as children. The parent keys this component by the current query so it
 * closes after a filter link navigates.
 */
export function FilterDrawer({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={<SlidersHorizontal aria-hidden className="size-4" />}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>
      <Drawer side="left" open={open} onClose={() => setOpen(false)} title="Filter produk">
        {children}
      </Drawer>
    </>
  );
}
