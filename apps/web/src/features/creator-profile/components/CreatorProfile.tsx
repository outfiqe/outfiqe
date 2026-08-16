"use client";

import { AvatarUploader, Badge, Button, Input, Modal, toast } from "@outfiqe/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FollowersModal } from "@/components/FollowersModal";
import { FollowingModal } from "@/components/FollowingModal";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUpdateCreatorProfile } from "@/features/creator-dashboard/hooks/useUpdateCreatorProfile";
import { PostDetailModal } from "@/features/explore";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { formatHeight } from "@/shared/lib/formatHeight";

import type { CreatorProfile as CreatorProfileType } from "../api/creatorProfileSchemas";
import { useInfiniteCreatorLooks } from "../hooks/useInfiniteCreatorLooks";
import { CreatorPostGridSkeleton } from "./CreatorPostGridSkeleton";
import { CreatorPostThumbnail } from "./CreatorPostThumbnail";

interface CreatorProfileProps {
  creator: CreatorProfileType;
}

export const CreatorProfile = ({ creator }: CreatorProfileProps) => {
  const router = useRouter();
  const { isAuthenticated, state, updateUser } = useAuth();
  const followMutation = useToggleFollow("user");
  const updateProfile = useUpdateCreatorProfile();
  const { handle, userId, heightCm, creatorStatus, postsCount, taggedPiecesCount, followingCount } =
    creator;
  const looks = useInfiniteCreatorLooks(handle);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = looks;

  const [name, setName] = useState(creator.name);
  const [avatarUrl, setAvatarUrl] = useState(creator.avatarUrl);
  const [isFollowing, setIsFollowing] = useState(creator.isFollowing);
  const [followerCount, setFollowerCount] = useState(creator.followerCount);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl);
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

  const openEdit = () => {
    setDraftName(name);
    setDraftAvatarUrl(avatarUrl);
    setEditOpen(true);
  };

  const saveEdit = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;

    updateProfile.mutate(
      { name: trimmed, avatarUrl: draftAvatarUrl },
      {
        onSuccess: (updated) => {
          setName(updated.name);
          setAvatarUrl(updated.avatarUrl);
          updateUser({ name: updated.name, avatarUrl: updated.avatarUrl });
          setEditOpen(false);
          toast.success("Profile updated");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const detailPost = posts.find((post) => post.id === detailPostId) ?? null;

  const avatarFallback = (
    <span
      aria-hidden
      className="flex size-full items-center justify-center text-2xl font-bold text-white"
      style={{ backgroundColor: getAvatarColor(userId) }}
    >
      {initialsFor(name)}
    </span>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-5 pb-8">
        <div
          className="size-20 shrink-0 overflow-hidden rounded-full bg-cover bg-center"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
        >
          {!avatarUrl && avatarFallback}
        </div>

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

        {isOwnProfile ? (
          <Button variant="outline" onClick={openEdit} className="shrink-0">
            Edit profile
          </Button>
        ) : (
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
        <CreatorPostGridSkeleton />
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

      {isOwnProfile && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit profile"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Photo</label>
              <AvatarUploader
                value={draftAvatarUrl}
                onChange={setDraftAvatarUrl}
                onUpload={uploadsApi.upload}
                fallback={avatarFallback}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Display name
              </label>
              <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
            </div>
          </div>
        </Modal>
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
