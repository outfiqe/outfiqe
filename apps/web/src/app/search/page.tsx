"use client";

import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchResults } from "@/features/search";

const SearchPage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
          <Suspense fallback={<ProductGridSkeleton className="mt-8" />}>
            <SearchResults />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default SearchPage;
