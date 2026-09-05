import { Skeleton } from "@outfiqe/design-system";

import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { RailSkeleton } from "@/components/RailSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const HomeLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <section className="pb-4 sm:px-6 lg:px-10">
          <Skeleton className="h-48 rounded-none sm:h-105 sm:rounded-3xl" />
        </section>

        <section className="px-6 pb-4 pt-4 sm:pb-6 sm:pt-6 lg:px-10">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-48" />
          <div className="-mx-2 mt-5 flex gap-3 overflow-hidden p-2">
            {Array.from({ length: 6 }).map((_, index) => (
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

        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default HomeLoading;
