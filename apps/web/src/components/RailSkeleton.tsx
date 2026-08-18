import { Skeleton } from "@outfiqe/design-system";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";

export const RailSkeleton = () => {
  return (
    <section className="px-6 py-10 sm:py-14 lg:px-10">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-8 w-56" />
      <ProductGridSkeleton className="mt-8" />
    </section>
  );
};
