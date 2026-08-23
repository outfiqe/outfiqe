"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Masonry from "react-masonry-css";

import { TRENDING_RANKS, type TrendingRank } from "@/shared/components/TrendingRankBadge";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import {
  EXPLORE_GRID_BREAKPOINT_COLUMNS,
  EXPLORE_QUERY_PARAM,
  EXPLORE_TAB,
  type ExploreQueryParamKey,
  FEED_LAYOUT,
  type FeedLayout,
} from "../explore.constants";
import { useExploreAuthGate } from "../hooks/useExploreAuthGate";
import { useExploreFeedSocket } from "../hooks/useExploreFeedSocket";
import { useInfiniteExploreFeed } from "../hooks/useInfiniteExploreFeed";
import { AddPostButton } from "./AddPostButton";
import { ExploreSidebarNav } from "./ExploreSidebarNav";
import { FeedFilterTabs } from "./FeedFilterTabs";
import { HeaderBackdrop } from "./HeaderBackdrop";
import { PostCard } from "./PostCard";
import { ExploreFeedSkeleton } from "./PostCardSkeleton";
import { PostDetailModal } from "./PostDetailModal";
import { PostGridCard } from "./PostGridCard";
import { Sidebar } from "./Sidebar";

export const ExploreFeed = () => {
  const { isAuthenticated, isAuthResolved, goToSignIn } = useExploreAuthGate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const tab = searchParams.get(EXPLORE_QUERY_PARAM.TAB) ?? EXPLORE_TAB.FOR_YOU;
  const layout: FeedLayout =
    searchParams.get(EXPLORE_QUERY_PARAM.LAYOUT) === FEED_LAYOUT.LIST
      ? FEED_LAYOUT.LIST
      : FEED_LAYOUT.GRID;

  const updateExploreParams = (updates: Partial<Record<ExploreQueryParamKey, string>>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  };

  const setTab = (value: string) => updateExploreParams({ [EXPLORE_QUERY_PARAM.TAB]: value });
  const setLayout = (value: FeedLayout) =>
    updateExploreParams({ [EXPLORE_QUERY_PARAM.LAYOUT]: value });

  const followingGated = isAuthResolved && tab === EXPLORE_TAB.FOLLOWING && !isAuthenticated;

  const {
    data: exploreFeedPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteExploreFeed(tab, isAuthResolved && !followingGated);

  const { newLookCount, dismiss } = useExploreFeedSocket(tab);

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const rawPosts = exploreFeedPages?.pages.flatMap((page) => page.posts) ?? [];
  const postsById = new Map(rawPosts.map((post) => [post.id, post]));
  const posts = [...postsById.values()];
  const detailPost = detailPostId ? (postsById.get(detailPostId) ?? null) : null;

  const isRankedTab = tab === EXPLORE_TAB.TRENDING || tab === EXPLORE_TAB.FOR_YOU;
  const trendingRankOf = (index: number): TrendingRank | undefined =>
    isRankedTab ? TRENDING_RANKS[index] : undefined;

  const showNewLooks = () => {
    dismiss();
    void refetch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <HeaderBackdrop />

      <div className="lg:hidden">
        <FeedFilterTabs tab={tab} onChange={setTab} layout={layout} onLayoutChange={setLayout} />
      </div>
      <AddPostButton />

      <div className="grid grid-cols-1 gap-9 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[224px_1fr_296px]">
        <ExploreSidebarNav tab={tab} onChange={setTab} layout={layout} onLayoutChange={setLayout} />

        <div>
          {newLookCount > 0 && (
            <button
              type="button"
              onClick={showNewLooks}
              className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {newLookCount === 1 ? "1 new look" : `${newLookCount} new looks`} — click to view
            </button>
          )}

          {followingGated ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to see looks from creators you follow.
              </p>
              <button
                type="button"
                onClick={goToSignIn}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Log in or sign up
              </button>
            </div>
          ) : !isAuthResolved || isLoading ? (
            <ExploreFeedSkeleton layout={layout} compactGrid />
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet — try a different tab.
            </p>
          ) : layout === FEED_LAYOUT.GRID ? (
            <Masonry
              breakpointCols={EXPLORE_GRID_BREAKPOINT_COLUMNS}
              className="-ml-4 flex w-auto"
              columnClassName="pl-4"
            >
              {posts.map((post, index) => {
                const { id } = post;
                return (
                  <PostGridCard
                    key={id}
                    post={post}
                    onClick={() => setDetailPostId(id)}
                    trendingRank={trendingRankOf(index)}
                  />
                );
              })}
            </Masonry>
          ) : (
            <div className="mx-auto flex max-w-xl flex-col">
              {posts.map((post, index) => (
                <PostCard key={post.id} post={post} trendingRank={trendingRankOf(index)} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center pt-6">
              <span className="text-xs text-muted-foreground">
                {isFetchingNextPage ? "Loading more…" : ""}
              </span>
            </div>
          )}
        </div>

        <Sidebar activeTag={tab} onTagClick={setTab} />
      </div>

      {detailPost && <PostDetailModal post={detailPost} onClose={() => setDetailPostId(null)} />}
    </>
  );
};
