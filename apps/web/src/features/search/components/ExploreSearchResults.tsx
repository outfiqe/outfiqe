"use client";

import { Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Masonry from "react-masonry-css";

import { PostDetailModal } from "@/features/explore/components/PostDetailModal";
import { PostGridCard } from "@/features/explore/components/PostGridCard";
import { EXPLORE_GRID_BREAKPOINT_COLUMNS } from "@/features/explore/explore.constants";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";

import { useCreatorSearch, useLookSearch } from "../hooks/useExploreSearch";
import { MIN_QUERY_LENGTH } from "../search.constants";

export const ExploreSearchResults = () => {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const hasQuery = query.length >= MIN_QUERY_LENGTH;
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const {
    data: creatorPages,
    fetchNextPage: fetchNextCreators,
    hasNextPage: hasMoreCreators,
    isFetchingNextPage: isFetchingMoreCreators,
    isLoading: isLoadingCreators,
  } = useCreatorSearch(query, hasQuery);

  const {
    data: postPages,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasMorePosts,
    isFetchingNextPage: isFetchingMorePosts,
    isLoading: isLoadingPosts,
  } = useLookSearch(query, hasQuery);

  const creatorSentinelRef = useLoadMoreOnVisible(
    () => fetchNextCreators(),
    Boolean(hasMoreCreators) && !isFetchingMoreCreators,
  );
  const postSentinelRef = useLoadMoreOnVisible(
    () => fetchNextPosts(),
    Boolean(hasMorePosts) && !isFetchingMorePosts,
  );

  if (!hasQuery) {
    return (
      <p className="mt-12 text-sm text-muted-foreground">Search for a creator, post, or hashtag.</p>
    );
  }

  const creators = creatorPages?.pages.flatMap((page) => page.creators) ?? [];
  const posts = postPages?.pages.flatMap((page) => page.posts) ?? [];
  const detailPost = detailPostId ? (posts.find((post) => post.id === detailPostId) ?? null) : null;
  const isLoading = isLoadingCreators || isLoadingPosts;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
        {query}
      </h1>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : creators.length === 0 && posts.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">
          No creators or posts matched. Try a different search.
        </p>
      ) : (
        <>
          {creators.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Creators
              </h2>
              <div className="mt-3 flex flex-col">
                {creators.map(({ userId, handle, name, avatarUrl, followerCount }) => (
                  <Link
                    key={userId}
                    href={`/creator/${handle}`}
                    className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cover bg-center"
                      style={
                        avatarUrl
                          ? { backgroundImage: `url(${avatarUrl})` }
                          : { backgroundColor: getAvatarColor(userId) }
                      }
                    >
                      {!avatarUrl && (
                        <span aria-hidden className="text-sm font-bold text-white">
                          {initialsFor(name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        @{handle} · {followerCount.toLocaleString()} followers
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              {hasMoreCreators && (
                <div ref={creatorSentinelRef} className="flex justify-center py-3">
                  <span className="text-xs text-muted-foreground">
                    {isFetchingMoreCreators ? "Loading more…" : ""}
                  </span>
                </div>
              )}
            </section>
          )}

          {posts.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Posts
              </h2>
              <Masonry
                breakpointCols={EXPLORE_GRID_BREAKPOINT_COLUMNS}
                className="-ml-4 mt-3 flex w-auto"
                columnClassName="pl-4"
              >
                {posts.map((post) => (
                  <PostGridCard
                    key={post.id}
                    post={post}
                    onClick={() => setDetailPostId(post.id)}
                  />
                ))}
              </Masonry>

              {hasMorePosts && (
                <div ref={postSentinelRef} className="flex justify-center py-3">
                  <span className="text-xs text-muted-foreground">
                    {isFetchingMorePosts ? "Loading more…" : ""}
                  </span>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {detailPost && <PostDetailModal post={detailPost} onClose={() => setDetailPostId(null)} />}
    </div>
  );
};
