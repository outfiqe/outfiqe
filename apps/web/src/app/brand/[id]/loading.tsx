import { Skeleton } from "@outfiqe/design-system";

import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const STAT_COUNT = 3;
const CATEGORY_PILL_COUNT = 4;

const BrandLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <Skeleton className="h-36 w-full rounded-none sm:h-52" />
            <div className="flex flex-col items-center px-6 pb-8 text-center">
              <Skeleton className="-mt-12 size-24 shrink-0 rounded-full ring-4 ring-card sm:-mt-14 sm:size-28" />
              <Skeleton className="mt-4 h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-24" />
              <div className="mt-5 flex gap-8">
                {Array.from({ length: STAT_COUNT }).map((_, index) => (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-24 rounded-full" />
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {Array.from({ length: CATEGORY_PILL_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-full" />
            ))}
          </div>

          <ProductGridSkeleton className="mt-8 gap-x-4 gap-y-8" />
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default BrandLoading;
