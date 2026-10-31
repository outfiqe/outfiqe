import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { hasServerSessionCookie } from "@/features/auth/api/serverAuth";
import { ExploreFeed, ExploreFeedLoading } from "@/features/explore";
import { EXPLORE_TAB } from "@/features/explore/constants/explore.constants";
import { buildExploreFeedQueryKey } from "@/features/explore/feed/api/exploreFeedQueryKey";
import { getExploreFeedFirstPageServer } from "@/features/explore/feed/api/serverExploreFeed";
import { toFeedLayout } from "@/features/explore/utils/readFeedLayout";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { buildPageMetadata } from "@/shared/seo";

const EXPLORE_PAGE_TITLE = "Explore muse looks";

export const metadata: Metadata = buildPageMetadata({
  title: EXPLORE_PAGE_TITLE,
  description:
    "A feed of real outfits from Nepali muses. Every look is shoppable. Tap any piece to see the price, sizes and the brand behind it.",
  path: "/explore",
  keywords: [
    "outfit inspiration Nepal",
    "muse looks",
    "Nepali fashion looks",
    "shop the look Nepal",
  ],
});

const SERVER_RENDERED_FEED_TABS = new Set<string>([EXPLORE_TAB.FOR_YOU, EXPLORE_TAB.TRENDING]);

type ExplorePageProps = {
  searchParams: Promise<{ tab?: string; layout?: string }>;
};

type PrefetchedExploreFeedProps = {
  feedTab: string;
  loadingState: ReactNode;
};

const PrefetchedExploreFeed = async ({ feedTab, loadingState }: PrefetchedExploreFeedProps) => {
  const queryClient = getQueryClient();
  const mayBeSignedIn = await hasServerSessionCookie();
  if (!mayBeSignedIn) {
    await queryClient
      .prefetchInfiniteQuery({
        queryKey: buildExploreFeedQueryKey(feedTab),
        queryFn: () => getExploreFeedFirstPageServer(feedTab),
        initialPageParam: undefined,
      })
      .catch(() => undefined);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={loadingState}>
        <ExploreFeed />
      </Suspense>
    </HydrationBoundary>
  );
};

const ExplorePage = async ({ searchParams }: ExplorePageProps) => {
  const { tab: requestedTab, layout: requestedLayout } = await searchParams;
  const feedTab =
    requestedTab && SERVER_RENDERED_FEED_TABS.has(requestedTab)
      ? requestedTab
      : EXPLORE_TAB.FOR_YOU;
  const loadingState = <ExploreFeedLoading layout={toFeedLayout(requestedLayout)} />;

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main>
        <h1 className="sr-only">{EXPLORE_PAGE_TITLE}</h1>
        <Suspense fallback={loadingState}>
          <PrefetchedExploreFeed feedTab={feedTab} loadingState={loadingState} />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default ExplorePage;
