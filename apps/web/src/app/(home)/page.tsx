import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { RailSkeleton } from "@/components/RailSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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

const HomePage = () => {
  return (
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
  );
};

export default HomePage;
