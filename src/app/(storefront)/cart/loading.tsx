import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/states";

export default function CartLoading() {
  return (
    <main aria-busy="true">
      <Container className="py-10 desktop:py-16">
        <Skeleton className="h-10 w-48" />
        <div className="mt-8 grid gap-10 desktop:grid-cols-3">
          <div className="flex flex-col gap-4 desktop:col-span-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </Container>
    </main>
  );
}
