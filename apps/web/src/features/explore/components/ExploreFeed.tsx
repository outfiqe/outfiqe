"use client";

import { useState } from "react";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { EXPLORE_TAB, FEED_LAYOUT, type FeedLayout } from "../explore.constants";
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
import { Sidebar } from "./Sidebar";

export const ExploreFeed = () => {
  const { isAuthenticated, goToSignIn } = useExploreAuthGate();
  const [tab, setTab] = useState<string>(EXPLORE_TAB.FOR_YOU);
  const [layout, setLayout] = useState<FeedLayout>(FEED_LAYOUT.GRID);
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);

  const followingGated = tab === EXPLORE_TAB.FOLLOWING && !isAuthenticated;

  const {
    data: exploreFeedPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteExploreFeed(tab, !followingGated);

  const { newLookCount, dismiss } = useExploreFeedSocket(tab);

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const posts = exploreFeedPages?.pages.flatMap((page) => page.posts) ?? [];

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
          ) : isLoading ? (
            <ExploreFeedSkeleton layout={layout} />
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet — try a different tab.
            </p>
          ) : layout === FEED_LAYOUT.GRID ? (
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onImageClick={() => setDetailPost(post)} />
              ))}
            </div>
          ) : (
            <div className="mx-auto flex max-w-xl flex-col">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
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

        <Sidebar onTagClick={setTab} />
      </div>

      {detailPost && <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />}
    </>
  );
};
