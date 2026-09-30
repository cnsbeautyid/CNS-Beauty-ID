import { Heart } from "lucide-react";

import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { RemoveFromWishlistButton } from "@/features/wishlist/remove-button";
import { requireUser } from "@/lib/auth/session";
import { listWishlist } from "@/services/account/account";

export const metadata = { title: "Wishlist" };

export default async function AccountWishlistPage() {
  await requireUser(ROUTES.account.wishlist);
  const items = await listWishlist();
  const ids = new Map((items ?? []).map((item) => [item.slug, item.productId]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-brand-cocoa-dark">Wishlist</h1>
      {items === null ? (
        <ErrorState
          description="Wishlist belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.account.wishlist} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : (
        <ProductGrid
          products={items}
          layout="with-sidebar"
          renderActions={(product) => {
            const id = ids.get(product.slug);
            return id ? <RemoveFromWishlistButton productId={id} productName={product.name} /> : null;
          }}
          empty={
            <EmptyState
              icon={<Heart className="size-8" strokeWidth={1.25} />}
              title="Wishlist masih kosong"
              description="Simpan produk favoritmu dari halaman produk untuk melihatnya lagi di sini."
              action={<ButtonLink href={ROUTES.products}>Jelajahi Produk</ButtonLink>}
            />
          }
        />
      )}
    </div>
  );
}
