import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandsGrid } from "@/features/brands";
import { getBrandsFirstPageServer } from "@/features/brands/api/serverBrands";
import { BRANDS_QUERY_KEY } from "@/features/brands/brands.constants";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Nepali clothing brands",
  description:
    "Every clothing brand on Outfiqe is a Nepali label. Browse them all, follow the ones you like, and shop their pieces styled in real creator looks.",
  path: "/brands",
  keywords: ["Nepali clothing brands", "Nepali fashion labels", "made in Nepal clothing"],
});

const BrandsPage = async () => {
  const queryClient = getQueryClient();
  await queryClient
    .prefetchInfiniteQuery({
      queryKey: BRANDS_QUERY_KEY,
      queryFn: () => getBrandsFirstPageServer(),
      initialPageParam: undefined,
    })
    .catch(() => undefined);

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <div className="px-6 pb-16 pt-8 sm:pt-10 lg:px-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
            Directory
          </span>
          <h1 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Brands
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Independent labels and makers building the future of Nepali fashion.
          </p>

          <div className="mt-8">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <BrandsGrid />
            </HydrationBoundary>
          </div>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default BrandsPage;
