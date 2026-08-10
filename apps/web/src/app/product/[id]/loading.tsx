import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Skeleton } from "@/design-system/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Skeleton className="my-3 h-4 w-16" />

          <div className="grid gap-8 pb-10 lg:grid-cols-2 lg:gap-14">
            <Skeleton className="aspect-4/5 rounded-2xl" />

            <div className="space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-4/5" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-40" />
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Skeleton className="h-10 w-14 rounded-lg" />
                <Skeleton className="h-10 w-14 rounded-lg" />
                <Skeleton className="h-10 w-14 rounded-lg" />
                <Skeleton className="h-10 w-14 rounded-lg" />
              </div>
              <div className="flex gap-2.5">
                <Skeleton className="h-11 flex-1 rounded-full" />
                <Skeleton className="size-11 shrink-0 rounded-full" />
              </div>
            </div>
          </div>

          <div className="border-t border-border py-10">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-4/5 rounded-xl" />
                  <Skeleton className="mt-2 h-3 w-3/5" />
                  <Skeleton className="mt-1.5 h-3 w-2/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
