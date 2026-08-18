import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { RailSkeleton } from "@/components/RailSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategoriesServer } from "@/features/categories";
import { CollectionsSection } from "@/features/collections";
import {
  BrandCallout,
  CategoryResults,
  CreatorLooks,
  Hero,
  NewArrivals,
  TasteCategories,
  TrendingNow,
} from "@/features/landing";
import { getQueryClient } from "@/shared/lib/getQueryClient";

const HomePage = async () => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({ queryKey: ["categories"], queryFn: getCategoriesServer });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="pb-20 lg:pb-0">
        <SiteHeader />
        <main>
          <Hero />
          <Suspense fallback={null}>
            <TasteCategories />
            <CategoryResults />
          </Suspense>
          <Suspense fallback={null}>
            <CollectionsSection />
          </Suspense>
          <Suspense fallback={<RailSkeleton />}>
            <TrendingNow />
          </Suspense>
          <Suspense fallback={<RailSkeleton />}>
            <CreatorLooks />
          </Suspense>
          <Suspense fallback={<RailSkeleton />}>
            <NewArrivals />
          </Suspense>
          <BrandCallout />
        </main>
        <SiteFooter />
        <MobileTabBar />
      </div>
    </HydrationBoundary>
  );
};

export default HomePage;
