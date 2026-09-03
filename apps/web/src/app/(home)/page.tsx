import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
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
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Outfiqe: Nepali fashion, worn by real creators",
  absoluteTitle: true,
  description:
    "See how clothes from Nepali brands actually fit before you buy, in real creator looks. One cart across every brand. Pay cash on delivery or by wallet, delivered across Nepal.",
  path: "/",
  keywords: [
    "Nepali fashion",
    "online clothing store Nepal",
    "Nepali clothing brands",
    "buy clothes online Nepal",
    "creator fashion Nepal",
  ],
});

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
