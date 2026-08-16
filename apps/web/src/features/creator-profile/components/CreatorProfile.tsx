"use client";

import { Badge, Button } from "@outfiqe/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FollowersModal } from "@/components/FollowersModal";
import { FollowingModal } from "@/components/FollowingModal";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ExploreFeedSkeleton, PostDetailModal } from "@/features/explore";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { formatHeight } from "@/shared/lib/formatHeight";

import type { CreatorProfile as CreatorProfileType } from "../api/creatorProfileSchemas";
import { useInfiniteCreatorLooks } from "../hooks/useInfiniteCreatorLooks";
import { CreatorPostThumbnail } from "./CreatorPostThumbnail";

interface CreatorProfileProps {
  creator: CreatorProfileType;
}

export const CreatorProfile = ({ creator }: CreatorProfileProps) => {
  const router = useRouter();
  const { isAuthenticated, state } = useAuth();
  const followMutation = useToggleFollow("user");
  const {
    handle,
    userId,
    name,
    heightCm,
    creatorStatus,
    postsCount,
    taggedPiecesCount,
    followingCount,
  } = creator;
  const looks = useInfiniteCreatorLooks(handle);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = looks;

  const [isFollowing, setIsFollowing] = useState(creator.isFollowing);
  const [followerCount, setFollowerCount] = useState(creator.followerCount);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const isOwnProfile = state.user?.id === userId;

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/creator/${handle}`);
      return;
    }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => count + (wasFollowing ? -1 : 1));
    followMutation.mutate(
      { targetId: userId, following: wasFollowing },
      {
        onError: () => {
          setIsFollowing(wasFollowing);
          setFollowerCount((count) => count + (wasFollowing ? 1 : -1));
        },
      },
    );
  };

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const detailPost = posts.find((post) => post.id === detailPostId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-5 pb-8">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: getAvatarColor(userId) }}
        >
          {initialsFor(name)}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            @{handle}
            {heightCm ? ` · ${formatHeight(heightCm)}` : ""}
          </p>
          {creatorStatus === "APPROVED" && <Badge className="mt-2">Approved creator</Badge>}

          <div className="mt-4 flex gap-6">
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">{postsCount}</p>
              <p className="text-[11.5px] text-muted-foreground">Posts</p>
            </div>
            <button
              type="button"
              onClick={() => setFollowersModalOpen(true)}
              disabled={followerCount === 0}
              className="cursor-pointer text-left disabled:cursor-not-allowed"
            >
              <p className="font-display text-lg font-extrabold text-foreground">
                {followerCount.toLocaleString()}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Followers</p>
            </button>
            <button
              type="button"
              onClick={() => setFollowingModalOpen(true)}
              disabled={followingCount === 0}
              className="cursor-pointer text-left disabled:cursor-not-allowed"
            >
              <p className="font-display text-lg font-extrabold text-foreground">
                {followingCount.toLocaleString()}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Following</p>
            </button>
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">
                {taggedPiecesCount}
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

      {isLoading ? (
        <ExploreFeedSkeleton />
      ) : posts.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {posts.map((post) => (
            <CreatorPostThumbnail
              key={post.id}
              post={post}
              onClick={() => setDetailPostId(post.id)}
            />
          ))}
        </div>
      )}

      {detailPost && (
        <PostDetailModal
          post={detailPost}
          onClose={() => setDetailPostId(null)}
          showCreatorHeader={false}
        />
      )}

      {followersModalOpen && (
        <FollowersModal
          targetType="user"
          targetId={userId}
          onClose={() => setFollowersModalOpen(false)}
        />
      )}

      {followingModalOpen && (
        <FollowingModal userId={userId} onClose={() => setFollowingModalOpen(false)} />
      )}

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full border border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
};
