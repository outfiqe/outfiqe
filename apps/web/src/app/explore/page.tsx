import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreFeed } from "@/features/explore";
import { getExploreFeedFirstPageServer } from "@/features/explore/api/serverExploreFeed";
import { EXPLORE_TAB } from "@/features/explore/explore.constants";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Explore creator looks",
  description:
    "A feed of real outfits from Nepali creators. Every look is shoppable. Tap any piece to see the price, sizes and the brand behind it.",
  path: "/explore",
  keywords: [
    "outfit inspiration Nepal",
    "creator looks",
    "Nepali fashion looks",
    "shop the look Nepal",
  ],
});

const SERVER_RENDERED_FEED_TABS = new Set<string>([EXPLORE_TAB.FOR_YOU, EXPLORE_TAB.TRENDING]);

type ExplorePageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const ExplorePage = async ({ searchParams }: ExplorePageProps) => {
  const { tab: requestedTab } = await searchParams;
  const feedTab =
    requestedTab && SERVER_RENDERED_FEED_TABS.has(requestedTab)
      ? requestedTab
      : EXPLORE_TAB.FOR_YOU;

  const queryClient = getQueryClient();
  await queryClient
    .prefetchInfiniteQuery({
      queryKey: ["explore-feed", feedTab],
      queryFn: () => getExploreFeedFirstPageServer(feedTab),
      initialPageParam: undefined,
    })
    .catch(() => undefined);

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={null}>
            <ExploreFeed />
          </Suspense>
        </HydrationBoundary>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default ExplorePage;
