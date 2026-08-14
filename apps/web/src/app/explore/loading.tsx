import { Skeleton } from "@outfiqe/design-system";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  EXPLORE_FIXED_TABS,
  ExploreFeedSkeleton,
  FEED_LAYOUT_OPTIONS,
  HeaderBackdrop,
} from "@/features/explore";

const ExploreLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <HeaderBackdrop />

        <div className="lg:hidden">
          <div className="sticky top-[var(--site-header-height,0px)] z-30 bg-background px-4">
            <div className="mx-auto flex max-w-6xl gap-2 py-3">
              {EXPLORE_FIXED_TABS.map(({ value }) => (
                <Skeleton key={value} className="h-8 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-9 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[224px_1fr_296px]">
          <aside className="sticky top-[76px] hidden h-fit w-56 shrink-0 flex-col gap-2 rounded-xl border border-border p-3 lg:flex">
            {EXPLORE_FIXED_TABS.map(({ value }) => (
              <Skeleton key={value} className="h-9 w-full rounded-lg" />
            ))}
            <div className="my-1 border-t border-border" />
            {FEED_LAYOUT_OPTIONS.map(({ value }) => (
              <Skeleton key={value} className="h-9 w-full rounded-lg" />
            ))}
          </aside>

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
};

export default ExploreLoading;
