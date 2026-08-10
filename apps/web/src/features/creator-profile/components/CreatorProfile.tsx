"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { formatHeight } from "@/shared/lib/formatHeight";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { Button } from "@/design-system/components/ui/button";
import { Badge } from "@/design-system/components/ui/badge";
import { ExploreFeedSkeleton, PostCard } from "@/features/explore";
import { useInfiniteCreatorLooks } from "../hooks/useInfiniteCreatorLooks";
import type { CreatorProfile as CreatorProfileType } from "../api/creatorProfileSchemas";

interface CreatorProfileProps {
  creator: CreatorProfileType;
}

export function CreatorProfile({ creator }: CreatorProfileProps) {
  const router = useRouter();
  const { isAuthenticated, state } = useAuth();
  const followMutation = useToggleFollow("user");
  const looks = useInfiniteCreatorLooks(creator.handle);

  const [isFollowing, setIsFollowing] = useState(creator.isFollowing);
  const [followerCount, setFollowerCount] = useState(creator.followerCount);
  const isOwnProfile = state.user?.id === creator.userId;

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/creator/${creator.handle}`);
      return;
    }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => count + (wasFollowing ? -1 : 1));
    followMutation.mutate(
      { targetId: creator.userId, following: wasFollowing },
      {
        onError: () => {
          setIsFollowing(wasFollowing);
          setFollowerCount((count) => count + (wasFollowing ? 1 : -1));
        },
      },
    );
  };

  const posts = looks.data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-5 pb-8">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: getAvatarColor(creator.userId) }}
        >
          {initialsFor(creator.name)}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {creator.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            @{creator.handle}
            {creator.heightCm ? ` · ${formatHeight(creator.heightCm)}` : ""}
          </p>
          {creator.creatorStatus === "APPROVED" && <Badge className="mt-2">Approved creator</Badge>}

          <div className="mt-4 flex gap-6">
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">
                {creator.postsCount}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">
                {followerCount.toLocaleString()}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">
                {creator.taggedPiecesCount}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Tagged pieces</p>
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <Button
            variant="outline"
            aria-pressed={isFollowing}
            onClick={toggleFollow}
            className="shrink-0"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {looks.isLoading ? (
        <ExploreFeedSkeleton />
      ) : posts.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {looks.hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void looks.fetchNextPage()}
            disabled={looks.isFetchingNextPage}
            className="rounded-full border border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {looks.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
