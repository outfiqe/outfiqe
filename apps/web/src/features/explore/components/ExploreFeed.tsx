"use client";

import { useState } from "react";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { FeedFilterTabs } from "./FeedFilterTabs";
import { PostCard } from "./PostCard";
import { Sidebar } from "./Sidebar";
import { useInfiniteExploreFeed } from "../hooks/useInfiniteExploreFeed";

export function ExploreFeed() {
  const [tab, setTab] = useState("for_you");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteExploreFeed(tab);

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <>
      <FeedFilterTabs tab={tab} onChange={setTab} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 px-4 pb-16 pt-6 lg:grid-cols-[1fr_296px]">
        <div>
          {!isLoading && posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet — try a different tab.
            </p>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
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
    </>
  );
}
