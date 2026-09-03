"use client";

import {
  AchievementBadgeIcon,
  AvatarUploader,
  Badge,
  Button,
  Input,
  Modal,
  toast,
} from "@outfiqe/design-system";
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { FollowersModal } from "@/components/FollowersModal";
import { FollowingModal } from "@/components/FollowingModal";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { FeaturedBadge } from "@/features/creator-dashboard/api/badgeSchemas";
import { EditPostModal } from "@/features/creator-dashboard/components/EditPostModal";
import { useDeleteLook } from "@/features/creator-dashboard/hooks/useDeleteLook";
import { useUpdateCreatorProfile } from "@/features/creator-dashboard/hooks/useUpdateCreatorProfile";
import { AddPostButton, PostDetailModal, usePublicLook } from "@/features/explore";
import { useChatPanel } from "@/features/messaging";
import { uploadsApi } from "@/shared/api/uploadsApi";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { formatHeight } from "@/shared/lib/formatHeight";
import { toUploadableImage } from "@/shared/lib/heicImage";

import type { CreatorProfile as CreatorProfileType } from "../api/creatorProfileSchemas";
import { useInfiniteCreatorLooks } from "../hooks/useInfiniteCreatorLooks";
import { CreatorPostGridSkeleton } from "./CreatorPostGridSkeleton";
import { CreatorPostThumbnail } from "./CreatorPostThumbnail";

interface CreatorProfileProps {
  creator: CreatorProfileType;
}

const MIN_HEIGHT_CM = 90;
const MAX_HEIGHT_CM = 251;
const MAX_PROFILE_FEATURED_BADGES = 3;
const TITLE_BADGE_FALLBACK_COLOR = "#f97316";
const LOOK_QUERY_PARAM = "look";

const badgeAccentColor = (designConfig: FeaturedBadge["designConfig"]): string =>
  "primaryColor" in designConfig ? designConfig.primaryColor : TITLE_BADGE_FALLBACK_COLOR;

export const CreatorProfile = ({ creator }: CreatorProfileProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, state, updateUser } = useAuth();
  const followMutation = useToggleFollow("user");
  const { openConversationWith, isStartingConversation } = useChatPanel();
  const updateProfile = useUpdateCreatorProfile();
  const deleteLook = useDeleteLook();
  const {
    handle,
    userId,
    creatorStatus,
    taggedPiecesCount,
    followingCount,
    featuredBadges,
    titleBadge,
  } = creator;
  const titleBadgeAccentColor = titleBadge ? badgeAccentColor(titleBadge.designConfig) : null;
  const looks = useInfiniteCreatorLooks(handle);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = looks;

  const [name, setName] = useState(creator.name);
  const [avatarUrl, setAvatarUrl] = useState(creator.avatarUrl);
  const [heightCm, setHeightCm] = useState(creator.heightCm);
  const [showHeight, setShowHeight] = useState(creator.showHeight);
  const [hideFromLeaderboards, setHideFromLeaderboards] = useState(creator.hideFromLeaderboards);
  const [isFollowing, setIsFollowing] = useState(creator.isFollowing);
  const [followerCount, setFollowerCount] = useState(creator.followerCount);
  const [postsCount, setPostsCount] = useState(creator.postsCount);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl);
  const [draftHeightCm, setDraftHeightCm] = useState(heightCm);
  const [draftShowHeight, setDraftShowHeight] = useState(showHeight);
  const [draftHideFromLeaderboards, setDraftHideFromLeaderboards] = useState(hideFromLeaderboards);
  const [editingLookId, setEditingLookId] = useState<string | null>(null);
  const [deletingLookId, setDeletingLookId] = useState<string | null>(null);
  const isOwnProfile = state.user?.id === userId;

  const detailPostId = searchParams.get(LOOK_QUERY_PARAM);

  const openPost = (lookId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(LOOK_QUERY_PARAM, lookId);
    router.replace(`/creator/${handle}?${params.toString()}`, { scroll: false });
  };

  const closePost = () => {
    const params = new URLSearchParams(searchParams);
    params.delete(LOOK_QUERY_PARAM);
    const query = params.toString();
    router.replace(`/creator/${handle}${query ? `?${query}` : ""}`, { scroll: false });
  };

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

  const messageCreator = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/creator/${handle}`);
      return;
    }
    openConversationWith(userId);
  };

  const openEdit = () => {
    setDraftName(name);
    setDraftAvatarUrl(avatarUrl);
    setDraftHeightCm(heightCm);
    setDraftShowHeight(showHeight);
    setDraftHideFromLeaderboards(hideFromLeaderboards);
    setEditOpen(true);
  };

  const saveEdit = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;

    updateProfile.mutate(
      {
        name: trimmed,
        avatarUrl: draftAvatarUrl,
        heightCm: draftHeightCm,
        showHeight: draftShowHeight,
        hideFromLeaderboards: draftHideFromLeaderboards,
      },
      {
        onSuccess: (updated) => {
          setName(updated.name);
          setAvatarUrl(updated.avatarUrl);
          setHeightCm(updated.heightCm);
          setShowHeight(updated.showHeight);
          setHideFromLeaderboards(updated.hideFromLeaderboards);
          updateUser({ name: updated.name, avatarUrl: updated.avatarUrl });
          setEditOpen(false);
          toast.success("Profile updated");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const detailPostFromGrid = posts.find((post) => post.id === detailPostId) ?? null;
  const { data: fetchedDetailPost } = usePublicLook(
    detailPostId && !detailPostFromGrid ? detailPostId : null,
  );
  const detailPost = detailPostFromGrid ?? fetchedDetailPost ?? null;

  const confirmDeletePost = () => {
    if (!deletingLookId) return;

    deleteLook.mutate(deletingLookId, {
      onSuccess: () => {
        setPostsCount((count) => Math.max(0, count - 1));
        setDeletingLookId(null);
        toast.success("Post deleted");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

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
      <div className="flex flex-wrap items-start gap-4 pb-8 sm:items-center sm:gap-5">
        <div className={cn("relative shrink-0", titleBadge && "rounded-full p-1.5")}>
          {titleBadge && (
            <div
              aria-hidden
              className="absolute inset-0 rounded-full animate-avatar-ring-spin"
              style={{
                background: `conic-gradient(from 0deg, ${titleBadgeAccentColor}, transparent 40%, transparent 60%, ${titleBadgeAccentColor})`,
                boxShadow: `0 0 14px 2px ${titleBadgeAccentColor}66`,
              }}
            />
          )}
          <div
            className="relative size-20 overflow-hidden rounded-full bg-cover bg-center"
            style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
          >
            {!avatarUrl && avatarFallback}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-xl font-extrabold uppercase leading-tight tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {name}
            {creatorStatus === "APPROVED" && (
              <span
                role="img"
                aria-label="Approved creator"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-6"
              >
                <Check className="size-3 sm:size-3.5" strokeWidth={3} />
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">@{handle}</p>

          {titleBadge && (
            <div
              className="mt-2 inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3"
              style={{
                backgroundColor: `${titleBadgeAccentColor}1A`,
                borderColor: `${titleBadgeAccentColor}4D`,
              }}
            >
              <AchievementBadgeIcon
                icon={titleBadge.icon}
                designConfig={titleBadge.designConfig}
                rarity={titleBadge.rarity}
                isLocked={false}
                className="size-6"
              />
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: titleBadgeAccentColor ?? undefined }}
              >
                {titleBadge.name}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {heightCm && (
              <Badge variant="outline" showDot={false}>
                {formatHeight(heightCm)}
              </Badge>
            )}

            {featuredBadges.length > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Badges
                </span>
                <div className="flex items-center gap-1.5">
                  {featuredBadges.slice(0, MAX_PROFILE_FEATURED_BADGES).map((badge) => {
                    const accentColor = badgeAccentColor(badge.designConfig);
                    return (
                      <span
                        key={badge.id}
                        title={badge.name}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full border sm:size-9"
                        style={{
                          backgroundColor: `${accentColor}1A`,
                          borderColor: `${accentColor}4D`,
                        }}
                      >
                        <AchievementBadgeIcon
                          icon={badge.icon}
                          designConfig={badge.designConfig}
                          rarity={badge.rarity}
                          isLocked={false}
                          className="size-6 sm:size-8"
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:flex sm:gap-6">
            <div>
              <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
                {postsCount}
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">Posts</p>
            </div>
            <button
              type="button"
              onClick={() => setFollowersModalOpen(true)}
              disabled={followerCount === 0}
              className="cursor-pointer text-left disabled:cursor-not-allowed"
            >
              <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
                {followerCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">Followers</p>
            </button>
            <button
              type="button"
              onClick={() => setFollowingModalOpen(true)}
              disabled={followingCount === 0}
              className="cursor-pointer text-left disabled:cursor-not-allowed"
            >
              <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
                {followingCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">Following</p>
            </button>
            <div>
              <p className="font-display text-base font-extrabold text-foreground sm:text-lg">
                {taggedPiecesCount}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground sm:text-[11.5px]">
                Tagged pieces
              </p>
            </div>
          </div>
        </div>

        {isOwnProfile ? (
          <Button
            variant="outline"
            size="sm"
            onClick={openEdit}
            className="w-full shrink-0 sm:w-auto"
          >
            Edit profile
          </Button>
        ) : (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              aria-pressed={isFollowing}
              onClick={toggleFollow}
              className="flex-1 sm:flex-none"
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={messageCreator}
              disabled={isStartingConversation}
              className="flex-1 sm:flex-none"
            >
              Message
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <CreatorPostGridSkeleton />
      ) : posts.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 sm:grid-cols-3">
          {posts.map((post) => (
            <CreatorPostThumbnail
              key={post.id}
              post={post}
              onClick={() => openPost(post.id)}
              isOwnProfile={isOwnProfile}
              onEdit={() => setEditingLookId(post.id)}
              onDelete={() => setDeletingLookId(post.id)}
            />
          ))}
        </div>
      )}

      {detailPost && (
        <PostDetailModal post={detailPost} onClose={closePost} showCreatorHeader={false} />
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
                describeUploadError={getErrorMessage}
                transformFile={toUploadableImage}
              />
            </div>
            <div>
              <label
                htmlFor="creator-profile-edit-name"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Display name
              </label>
              <Input
                id="creator-profile-edit-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="creator-profile-edit-height"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Height (cm)
              </label>
              <Input
                id="creator-profile-edit-height"
                type="number"
                min={MIN_HEIGHT_CM}
                max={MAX_HEIGHT_CM}
                value={draftHeightCm ?? ""}
                onChange={(event) =>
                  setDraftHeightCm(event.target.value ? Number(event.target.value) : null)
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={draftShowHeight}
                onChange={(event) => setDraftShowHeight(event.target.checked)}
              />
              Show height on my profile
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={draftHideFromLeaderboards}
                onChange={(event) => setDraftHideFromLeaderboards(event.target.checked)}
              />
              Hide me from leaderboards
            </label>
          </div>
        </Modal>
      )}

      {isOwnProfile && (
        <>
          <AddPostButton />
          <EditPostModal lookId={editingLookId} onClose={() => setEditingLookId(null)} />
          <Modal
            open={deletingLookId !== null}
            onClose={() => setDeletingLookId(null)}
            title="Delete post?"
            description="This can't be undone."
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletingLookId(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeletePost}
                  disabled={deleteLook.isPending}
                  className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white"
                >
                  {deleteLook.isPending ? "Deleting…" : "Delete"}
                </Button>
              </div>
            }
          >
            <p className="text-sm text-muted-foreground">
              Likes, comments, and tags on this post will be removed too.
            </p>
          </Modal>
        </>
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
