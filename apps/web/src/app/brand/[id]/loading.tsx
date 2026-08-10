import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Skeleton } from "@/design-system/components/ui/skeleton";

export default function BrandLoading() {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-5 pb-8">
            <Skeleton className="size-20 shrink-0 rounded-full" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-6 pt-2">
                <Skeleton className="h-9 w-12" />
                <Skeleton className="h-9 w-12" />
                <Skeleton className="h-9 w-12" />
              </div>
            </div>

            <Skeleton className="h-10 w-28 shrink-0 rounded-full" />
          </div>

          <ProductGridSkeleton className="gap-x-4 gap-y-8" />
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
