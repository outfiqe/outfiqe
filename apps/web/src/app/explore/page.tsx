import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreFeed } from "@/features/explore";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Explore creator looks",
  description:
    "A feed of real outfits from Nepali creators — every look is shoppable. Tap any piece to see the price, sizes and the brand behind it.",
  path: "/explore",
  keywords: [
    "outfit inspiration Nepal",
    "creator looks",
    "Nepali fashion looks",
    "shop the look Nepal",
  ],
});

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
