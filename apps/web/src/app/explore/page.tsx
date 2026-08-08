import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="pb-20 md:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">Explore is coming soon.</p>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
