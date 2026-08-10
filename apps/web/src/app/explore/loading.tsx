import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Skeleton } from "@/design-system/components/ui/skeleton";
import { ExploreFeedSkeleton } from "@/features/explore";

export default function ExploreLoading() {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4">
          <div className="mx-auto flex max-w-6xl gap-2 py-3">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 px-4 pb-16 pt-6 lg:grid-cols-[1fr_296px]">
          <ExploreFeedSkeleton />

          <aside className="hidden h-fit flex-col gap-4 lg:flex">
            <div className="rounded-xl border border-border p-4">
              <Skeleton className="h-3 w-32" />
              <div className="mt-3 flex flex-col gap-2.5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <Skeleton className="h-3 w-24" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Skeleton className="h-7 w-16 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-14 rounded-full" />
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
