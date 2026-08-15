import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import { WishlistPageBody } from "./WishlistPageBody";

export const metadata: Metadata = { title: "Saved" };

const WishlistPage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Saved
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Everything you&apos;ve kept for later.</p>
        <Suspense fallback={null}>
          <WishlistPageBody />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default WishlistPage;
