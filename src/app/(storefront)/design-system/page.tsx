import { Heart, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-grid";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, RadioGroup } from "@/components/ui/choice";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";

import { OverlayDemos } from "./demos";
import { SAMPLE_PRODUCTS, SWATCHES, TYPE_SCALE } from "./fixtures";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

// Internal preview. Hidden in production unless explicitly enabled.
function isPreviewEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DESIGN_PREVIEW === "true";
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-border py-12">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default async function DesignSystemPage() {
  await connection();
  if (!isPreviewEnabled()) notFound();

  return (
    <main id="main-content" className="pb-section">
      <Container>
        <header className="py-12">
          <p className="text-caption tracking-eyebrow text-text-secondary uppercase">Internal · Phase 1</p>
          <h1 className="mt-3 text-display-l text-brand-cocoa-dark">CNS Beauty Design System</h1>
          <p className="mt-4 max-w-2xl text-body-l text-text-secondary">
            Pratinjau token dan komponen. Semua data produk di halaman ini adalah contoh, bukan produk CNS Beauty.
          </p>
        </header>

        <Section id="ds-colors" title="Warna">
          <ul className="grid grid-cols-2 gap-4 tablet:grid-cols-4 desktop:grid-cols-5">
            {SWATCHES.map((swatch) => (
              <li key={swatch.name} className="flex flex-col gap-2">
                <span aria-hidden className={`h-16 rounded-md border border-border ${swatch.className}`} />
                <span className="text-caption text-text-secondary">{swatch.name}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="ds-type" title="Tipografi">
          <ul className="flex flex-col gap-4">
            {TYPE_SCALE.map((style) => (
              <li key={style.name} className="flex flex-col gap-1 tablet:flex-row tablet:items-baseline tablet:gap-6">
                <span className="w-24 shrink-0 text-caption text-text-secondary">{style.name}</span>
                <span className={style.className}>Ritual cantik untuk diri sendiri</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="ds-buttons" title="Tombol">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="brand">Brand</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="ai">Beauty AI</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <ButtonLink href={ROUTES.products} variant="secondary">
                Link sebagai tombol
              </ButtonLink>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <IconButton label="Tambah ke wishlist" icon={<Heart aria-hidden className="size-5" strokeWidth={1.5} />} />
              <IconButton
                variant="outline"
                label="Keranjang, 3 produk"
                count={3}
                icon={<ShoppingBag aria-hidden className="size-5" strokeWidth={1.5} />}
              />
            </div>
          </div>
        </Section>

        <Section id="ds-forms" title="Form">
          <div className="grid max-w-3xl gap-6 tablet:grid-cols-2">
            <Input id="ds-name" label="Nama lengkap" placeholder="Nama sesuai KTP" required />
            <Input id="ds-phone" label="Nomor WhatsApp" hint="Untuk konfirmasi pesanan." inputMode="tel" />
            <Input id="ds-email" label="Email" defaultValue="bukan-email" error="Format email belum sesuai." />
            <Select
              id="ds-skin"
              label="Jenis kulit"
              placeholder="Pilih jenis kulit"
              options={[
                { value: "normal", label: "Normal" },
                { value: "dry", label: "Kering" },
                { value: "oily", label: "Berminyak" },
                { value: "combination", label: "Kombinasi" },
              ]}
            />
            <div className="tablet:col-span-2">
              <Textarea id="ds-notes" label="Catatan" placeholder="Ceritakan kebutuhan kulitmu" />
            </div>
            <Checkbox id="ds-terms" label="Saya menyetujui syarat & ketentuan" />
            <RadioGroup
              name="ds-sensitivity"
              legend="Sensitivitas kulit"
              defaultValue="low"
              options={[
                { value: "low", label: "Jarang iritasi" },
                { value: "high", label: "Mudah iritasi", hint: "Kemerahan atau perih setelah memakai produk baru." },
              ]}
            />
          </div>
        </Section>

        <Section id="ds-badges" title="Badge & Card">
          <div className="flex flex-wrap gap-3">
            <Badge>Neutral</Badge>
            <Badge tone="brand">Baru</Badge>
            <Badge tone="ai">Rekomendasi AI</Badge>
            <Badge tone="success">Tersedia</Badge>
            <Badge tone="error">Habis</Badge>
          </div>
          <div className="mt-8 grid gap-4 tablet:grid-cols-3">
            <Card>
              <p className="font-display text-h4">Card default</p>
              <p className="mt-2 text-body-s text-text-secondary">Border tipis, tanpa bayangan berat.</p>
            </Card>
            <Card tone="surface">
              <p className="font-display text-h4">Card surface</p>
            </Card>
            <Card tone="ai">
              <p className="font-display text-h4">Card AI</p>
            </Card>
          </div>
        </Section>

        <Section id="ds-overlays" title="Overlay & Beauty AI">
          <OverlayDemos />
        </Section>

        <Section id="ds-products" title="Product Card">
          <ProductGrid products={SAMPLE_PRODUCTS} />
          <h3 className="mt-12 mb-6 text-h4">Loading</h3>
          <ProductGridSkeleton count={4} />
          <h3 className="mt-12 text-h4">Empty</h3>
          <ProductGrid products={[]} />
        </Section>

        <Section id="ds-states" title="State">
          <div className="grid gap-4 tablet:grid-cols-3">
            <Card>
              <LoadingState />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
            <Card>
              <EmptyState title="Wishlist kosong" description="Simpan produk favoritmu di sini." />
            </Card>
            <Card>
              <ErrorState />
            </Card>
          </div>
        </Section>
      </Container>
    </main>
  );
}
