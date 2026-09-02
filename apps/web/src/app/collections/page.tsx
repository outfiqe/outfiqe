import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CollectionsGrid } from "@/features/collections";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Fashion collections",
  description:
    "Shop Outfiqe's curated collections — seasonal edits, festive looks and occasion-based picks pulled from across every Nepali brand we carry.",
  path: "/collections",
  keywords: ["fashion collections Nepal", "festive wear Nepal", "seasonal fashion Nepal"],
});

const CollectionsPage = () => {
  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
            Curated
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
            Collections
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Edits built around a season, an occasion, or a way of dressing — not a category tree.
          </p>

          <div className="mt-8">
            <CollectionsGrid />
          </div>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default CollectionsPage;
