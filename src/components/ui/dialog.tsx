"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { IconButton } from "./icon-button";

export type DialogPlacement = "center" | "left" | "right" | "bottom";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  hideTitle?: boolean;
  placement?: DialogPlacement;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Accessible modal built on native <dialog>: focus trap, Escape, inert page
 * and focus return come from the browser. Layout and motion live in
 * globals.css (`.cns-dialog`).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  hideTitle,
  placement = "center",
  footer,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-placement={placement}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a backdrop click.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn("cns-dialog", className)}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className={cn("flex flex-col gap-1 pt-2", hideTitle && "sr-only")}>
            <h2 id={titleId} className="text-h4">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-body-s text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Tutup" icon={<X aria-hidden className="size-5" />} onClick={onClose} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}

type OverlayProps = Omit<DialogProps, "placement">;

export function Modal(props: OverlayProps) {
  return <Dialog placement="center" {...props} />;
}

export function Drawer({ side = "right", ...props }: OverlayProps & { side?: "left" | "right" }) {
  return <Dialog placement={side} {...props} />;
}

/** Bottom sheet for mobile-first flows. */
export function Sheet(props: OverlayProps) {
  return <Dialog placement="bottom" {...props} />;
}
