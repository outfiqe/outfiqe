import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreFeed } from "@/features/explore";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <ExploreFeed />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
