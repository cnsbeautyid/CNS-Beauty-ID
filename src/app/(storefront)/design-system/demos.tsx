"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, Modal, Sheet } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores/ui-store";

type Open = "modal" | "drawer" | "sheet" | null;

export function OverlayDemos() {
  const [open, setOpen] = useState<Open>(null);
  const [loading, setLoading] = useState(false);
  const openAIPanel = useUIStore((state) => state.openAIPanel);
  const close = () => setOpen(null);

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setOpen("modal")}>
        Buka modal
      </Button>
      <Button variant="secondary" onClick={() => setOpen("drawer")}>
        Buka drawer
      </Button>
      <Button variant="secondary" onClick={() => setOpen("sheet")}>
        Buka bottom sheet
      </Button>
      <Button variant="ai" leadingIcon={<Sparkles aria-hidden className="size-4" />} onClick={() => openAIPanel()}>
        Buka Beauty AI
      </Button>
      <Button
        loading={loading}
        onClick={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1500);
        }}
      >
        {loading ? "Memproses…" : "Tombol loading"}
      </Button>

      <Modal
        open={open === "modal"}
        onClose={close}
        title="Contoh modal"
        description="Fokus terkunci di dalam dialog; tekan Escape untuk menutup."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={close}>
              Batal
            </Button>
            <Button onClick={close}>Simpan</Button>
          </div>
        }
      >
        <Input id="demo-modal-email" label="Email" type="email" placeholder="nama@email.com" />
      </Modal>
      <Drawer open={open === "drawer"} onClose={close} title="Contoh drawer">
        <p className="text-body text-text-secondary">Drawer kanan untuk keranjang atau filter.</p>
      </Drawer>
      <Sheet open={open === "sheet"} onClose={close} title="Contoh bottom sheet">
        <p className="text-body text-text-secondary">Bottom sheet untuk interaksi mobile.</p>
      </Sheet>
    </div>
  );
}
