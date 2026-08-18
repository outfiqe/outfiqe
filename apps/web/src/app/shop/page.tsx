import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategoriesServer } from "@/features/categories";
import { ShopResults } from "@/features/shop";
import { getQueryClient } from "@/shared/lib/getQueryClient";

export const metadata: Metadata = { title: "Shop" };

const ShopPage = async () => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({ queryKey: ["categories"], queryFn: getCategoriesServer });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="pb-20 lg:pb-0">
        <SiteHeader />
        <main>
          <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
            <Suspense fallback={<ProductGridSkeleton className="mt-8" />}>
              <ShopResults />
            </Suspense>
          </div>
        </main>
        <SiteFooter />
        <MobileTabBar />
      </div>
    </HydrationBoundary>
  );
};

export default ShopPage;
