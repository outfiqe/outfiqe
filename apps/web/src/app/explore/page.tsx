import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreFeed } from "@/features/explore";

export const metadata: Metadata = { title: "Explore" };

const ExplorePage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <Suspense fallback={null}>
          <ExploreFeed />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default ExplorePage;
