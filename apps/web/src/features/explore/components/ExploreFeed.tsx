"use client";

import { useState } from "react";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { useExploreFeedSocket } from "../hooks/useExploreFeedSocket";
import { useInfiniteExploreFeed } from "../hooks/useInfiniteExploreFeed";
import { AddPostButton } from "./AddPostButton";
import { FeedFilterTabs, type FeedLayout } from "./FeedFilterTabs";
import { PostCard } from "./PostCard";
import { ExploreFeedSkeleton } from "./PostCardSkeleton";
import { PostListItem } from "./PostListItem";
import { Sidebar } from "./Sidebar";

export const ExploreFeed = () => {
  const [tab, setTab] = useState("for_you");
  const [layout, setLayout] = useState<FeedLayout>("grid");

  const {
    data: exploreFeedPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteExploreFeed(tab);

  const { newLookCount, dismiss } = useExploreFeedSocket();

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
      <FeedFilterTabs tab={tab} onChange={setTab} layout={layout} onLayoutChange={setLayout} />
      <AddPostButton />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 px-4 pb-16 pt-6 lg:grid-cols-[1fr_296px]">
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

          {isLoading ? (
            <ExploreFeedSkeleton layout={layout} />
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet — try a different tab.
            </p>
          ) : layout === "grid" ? (
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post) => (
                <PostListItem key={post.id} post={post} />
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
    </>
  );
};
