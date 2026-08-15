import { Skeleton } from "@outfiqe/design-system";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const CartLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Your bag
        </h1>
        <div className="space-y-4 py-6">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default CartLoading;
