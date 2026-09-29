import { Container } from "@/components/layout/container";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { Skeleton } from "@/components/ui/states";

export default function ProductsLoading() {
  return (
    <main id="main-content" aria-busy="true">
      <div className="bg-brand-cream">
        <Container className="py-12 desktop:py-16">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-4 h-12 w-2/3 max-w-md" />
          <Skeleton className="mt-8 h-12 w-full max-w-xl rounded-pill" />
        </Container>
      </div>
      <Container className="py-10">
        <ProductGridSkeleton count={8} />
      </Container>
    </main>
  );
}
