import { Suspense } from "react";

import {
  BrandCallout,
  CategoryResults,
  CreatorLooks,
  Hero,
  NewArrivals,
  TasteCategories,
  TrendingNow,
} from "@/features/landing";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <Hero />
        <Suspense fallback={null}>
          <TasteCategories />
          <CategoryResults />
        </Suspense>
        <TrendingNow />
        <CreatorLooks />
        <NewArrivals />
        <BrandCallout />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
