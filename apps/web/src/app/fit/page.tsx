import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { FIT_PAGE_PATH, FitFinder } from "@/features/size-fit";
import { buildPageMetadata } from "@/shared/seo";

interface FitPageProps {
  searchParams: Promise<{ heightCm?: string; weightKg?: string; type?: string }>;
}

export const generateMetadata = async ({ searchParams }: FitPageProps): Promise<Metadata> => {
  const { heightCm, weightKg } = await searchParams;
  return buildPageMetadata({
    title: "Find what fits me",
    description:
      "Enter your height and weight to see every piece on Outfiqe that is cut for you, with the size to pick in each brand.",
    path: FIT_PAGE_PATH,
    noIndex: Boolean(heightCm ?? weightKg),
    keywords: ["clothes that fit me Nepal", "find my size online", "size by height and weight"],
  });
};

const FitPage = () => (
  <div className="pb-20 lg:pb-0">
    <SiteHeader />
    <main>
      <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
        <header>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
            Fit finder
          </span>
          <h1 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Find what fits me
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Every brand sizes differently, so we match your height and weight against each
            product&apos;s own size chart and tell you which size to pick.
          </p>
        </header>
        <div className="mt-8">
          <Suspense fallback={<ProductGridSkeleton />}>
            <FitFinder />
          </Suspense>
        </div>
      </div>
    </main>
    <SiteFooter />
    <MobileTabBar />
  </div>
);

export default FitPage;
