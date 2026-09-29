import { CircleAlert, CircleCheck, MessageCircle } from "lucide-react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/utils/whatsapp";
import type { ProductDetail } from "@/types/product";

type PurchasePanelProps = {
  product: Pick<ProductDetail, "name" | "price" | "compareAtPrice" | "availability">;
  whatsapp?: string;
};

/**
 * Price, availability and purchase actions. The online cart arrives in
 * Phase 6; until then Add to Cart is disabled with an honest note and
 * WhatsApp is offered as the real ordering channel.
 */
export function PurchasePanel({ product, whatsapp }: PurchasePanelProps) {
  const soldOut = product.availability === "out_of_stock";
  const message = soldOut
    ? `Halo CNS Beauty, saya ingin menanyakan ketersediaan ${product.name}.`
    : `Halo CNS Beauty, saya ingin memesan ${product.name}.`;

  return (
    <div className="flex flex-col gap-5">
      <Price price={product.price} compareAt={product.compareAtPrice} className="text-h4" />

      <p className={soldOut ? "flex items-center gap-2 text-body-s text-text-primary" : "flex items-center gap-2 text-body-s text-success"}>
        {soldOut ? (
          <CircleAlert aria-hidden className="size-4 text-warning" />
        ) : (
          <CircleCheck aria-hidden className="size-4" />
        )}
        {soldOut ? "Stok habis" : "Tersedia"}
      </p>

      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth disabled aria-describedby="purchase-note">
          {soldOut ? "Stok habis" : "Tambah ke Keranjang"}
        </Button>
        <p id="purchase-note" className="text-caption text-text-secondary">
          {soldOut
            ? "Produk ini sedang tidak tersedia. Tanyakan ketersediaannya kepada tim kami."
            : "Pemesanan online segera hadir. Untuk saat ini, pesan melalui WhatsApp."}
        </p>
        {whatsapp && (
          <a
            href={whatsappUrl(whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary text-body-s font-medium text-text-primary transition-colors duration-(--duration-base) hover:bg-secondary"
          >
            <MessageCircle aria-hidden className="size-4" />
            {soldOut ? "Tanya via WhatsApp" : "Pesan via WhatsApp"}
            <span className="sr-only">(membuka WhatsApp)</span>
          </a>
        )}
        <AskAIButton fullWidth prefill={`Apakah ${product.name} cocok untuk kulit saya?`}>
          Tanya Beauty AI tentang produk ini
        </AskAIButton>
      </div>
    </div>
  );
}

/** Mobile sticky bar: price + primary action, above the home indicator. */
export function StickyCommerceBar({ product }: { product: Pick<ProductDetail, "price" | "compareAtPrice" | "availability"> }) {
  const soldOut = product.availability === "out_of_stock";
  return (
    <div
      data-sticky-commerce
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-(--safe-bottom) backdrop-blur-sm desktop:hidden"
    >
      <div className="flex items-center gap-4">
        <Price price={product.price} compareAt={product.compareAtPrice} className="flex-1" />
        <Button disabled size="md">
          {soldOut ? "Stok habis" : "Tambah ke Keranjang"}
        </Button>
      </div>
    </div>
  );
}
