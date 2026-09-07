import { Skeleton } from "@outfiqe/design-system";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";

const TASTE_CATEGORY_CHIP_COUNT = 6;

const TasteLoading = () => (
  <div role="status" aria-label="Loading your taste">
    <section className="px-6 pb-4 pt-4 sm:pb-6 sm:pt-6 lg:px-10">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-48" />
      <div className="-mx-2 mt-5 flex gap-3 overflow-hidden p-2">
        {Array.from({ length: TASTE_CATEGORY_CHIP_COUNT }).map((_, index) => (
          <Skeleton key={index} className="size-28 shrink-0 rounded-2xl sm:size-32" />
        ))}
      </div>
    </section>

    <section className="px-6 pb-10 pt-2 sm:pb-14 sm:pt-3 lg:px-10">
      <Skeleton className="h-9 w-64" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <ProductGridSkeleton className="mt-8" />
    </section>
  </div>
);

export default TasteLoading;
