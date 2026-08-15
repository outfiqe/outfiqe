"use client";

import { useState } from "react";
import Masonry from "react-masonry-css";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { MASONRY_BREAKPOINT_COLUMNS } from "../explore.constants";
import { useInfiniteSavedPosts } from "../hooks/useInfiniteSavedPosts";
import { PostCard } from "./PostCard";
import { ExploreFeedSkeleton } from "./PostCardSkeleton";
import { PostDetailModal } from "./PostDetailModal";

export const SavedPostsGrid = () => {
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const {
    data: savedPostPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteSavedPosts();

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const rawPosts = savedPostPages?.pages.flatMap((page) => page.posts) ?? [];
  const postsById = new Map(rawPosts.map((post) => [post.id, post]));
  const posts = [...postsById.values()];
  const detailPost = detailPostId ? (postsById.get(detailPostId) ?? null) : null;

  if (isLoading) {
    return <ExploreFeedSkeleton />;
  }

  if (posts.length === 0) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        Nothing saved yet — tap the bookmark on a post to keep it here.
      </p>
    );
  }

  return (
    <>
      <Masonry
        breakpointCols={MASONRY_BREAKPOINT_COLUMNS}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4"
      >
        {posts.map((post) => {
          const { id } = post;
          return <PostCard key={id} post={post} onImageClick={() => setDetailPostId(id)} />;
        })}
      </Masonry>

      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center pt-6">
          <span className="text-xs text-muted-foreground">
            {isFetchingNextPage ? "Loading more…" : ""}
          </span>
        </div>
      )}

      {detailPost && <PostDetailModal post={detailPost} onClose={() => setDetailPostId(null)} />}
    </>
  );
};
