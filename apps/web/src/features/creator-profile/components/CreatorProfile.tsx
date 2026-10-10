"use client";

import { Badge, Button, Modal, toast } from "@outfiqe/design-system";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Masonry from "react-masonry-css";

import { FollowersModal } from "@/components/FollowersModal";
import { FollowingModal } from "@/components/FollowingModal";
import { useAuth } from "@/features/auth/context/AuthContext";
import { EditPostModal } from "@/features/creator-dashboard/looks/components/EditPostModal";
import { useDeleteLook } from "@/features/creator-dashboard/looks/hooks/useDeleteLook";
import { AddPostButton, PostDetailModal, usePublicLook } from "@/features/explore";
import { useChatPanel } from "@/features/messaging";
import { ProfileBuildsTabs } from "@/features/outfit-build/my-builds/components/ProfileBuildsTabs";
import { shareOrCopyLink } from "@/features/pwa";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { formatHeight } from "@/shared/lib/formatHeight";

import type { CreatorProfile as CreatorProfileType } from "../api/creatorProfileSchemas";
import { useCreatorFollowToggle } from "../hooks/useCreatorFollowToggle";
import { useCreatorLookQueryParams } from "../hooks/useCreatorLookQueryParams";
import { useEditableCreatorProfile } from "../hooks/useEditableCreatorProfile";
import { useInfiniteCreatorLooks } from "../hooks/useInfiniteCreatorLooks";
import { badgeAccentColor } from "../utils/badgeAccentColor";
import { CreatorFeaturedBadges } from "./CreatorFeaturedBadges";
import { CreatorPostGridSkeleton } from "./CreatorPostGridSkeleton";
import { CreatorPostThumbnail } from "./CreatorPostThumbnail";
import { CreatorProfileActions } from "./CreatorProfileActions";
import { CreatorProfileAvatar } from "./CreatorProfileAvatar";
import { CreatorProfileStats } from "./CreatorProfileStats";
import { CreatorTitleBadgePill } from "./CreatorTitleBadgePill";
import { DeleteDropModal } from "./DeleteDropModal";
import { EditCreatorProfileFields } from "./EditCreatorProfileFields";

interface CreatorProfileProps {
  creator: CreatorProfileType;
}

const CREATOR_POST_GRID_BREAKPOINT_COLUMNS = { default: 3, 639: 2 };

export const CreatorProfile = ({ creator }: CreatorProfileProps) => {
  const router = useRouter();
  const { isAuthenticated, isAuthResolved, isStaff, state } = useAuth();
  const { openConversationWith, isStartingConversation } = useChatPanel();
  const deleteLook = useDeleteLook();
  const { userId, creatorStatus, taggedPiecesCount, followingCount, featuredBadges, titleBadge } =
    creator;
  const titleBadgeAccentColor = titleBadge ? badgeAccentColor(titleBadge.designConfig) : null;
  const showsAvatarRing = titleBadge?.showProfileRing ?? false;

  const {
    name,
    handle,
    avatarUrl,
    heightCm,
    editOpen,
    setEditOpen,
    openEdit,
    saveEdit,
    canSaveHandle,
    isSavingProfile,
    draftFields,
  } = useEditableCreatorProfile(creator);
  const { isFollowing, followerCount, toggleFollow } = useCreatorFollowToggle({
    userId,
    handle,
    initialIsFollowing: creator.isFollowing,
    initialFollowerCount: creator.followerCount,
  });
  const [postsCount, setPostsCount] = useState(creator.postsCount);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [deletingLookId, setDeletingLookId] = useState<string | null>(null);
  const isOwnProfile = state.user?.id === userId;

  const looks = useInfiniteCreatorLooks(handle, isAuthResolved, state.user?.id);
  const {
    data,
    isLoading: isFetchingLooks,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = looks;
  const isLoading = isFetchingLooks || !isAuthResolved;

  const { detailPostId, activeEditLookId, setEditingLookId, closeEdit, openPost, closePost } =
    useCreatorLookQueryParams(handle, isOwnProfile);

  const messageCreator = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/creator/${handle}`);
      return;
    }
    openConversationWith(userId);
  };

  const shareProfile = async () => {
    const outcome = await shareOrCopyLink({
      title: `${name} on Outfiqe`,
      text: `Check out @${handle}'s looks on Outfiqe`,
      url: `${window.location.origin}/creator/${handle}`,
    });
    if (outcome === "copied") toast.success("Link copied");
    if (outcome === "failed") toast.error("Couldn't share or copy the link");
  };

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const detailPostFromGrid = posts.find((post) => post.id === detailPostId) ?? null;
  const { data: fetchedDetailPost } = usePublicLook(
    detailPostId && !detailPostFromGrid ? detailPostId : null,
    isAuthResolved,
    state.user?.id,
  );
  const detailPost = detailPostFromGrid ?? fetchedDetailPost ?? null;

  const confirmDeletePost = () => {
    if (!deletingLookId) return;

    deleteLook.mutate(deletingLookId, {
      onSuccess: () => {
        setPostsCount((count) => Math.max(0, count - 1));
        setDeletingLookId(null);
        toast.success("Drop deleted");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const avatarFallback = (
    <span
      aria-hidden
      className="flex size-full items-center justify-center text-xl font-bold text-white sm:text-2xl"
      style={{ backgroundColor: getAvatarColor(userId) }}
    >
      {initialsFor(name)}
    </span>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex flex-wrap items-start gap-3 pb-6 sm:items-center sm:gap-5 sm:pb-8">
        <CreatorProfileAvatar
          avatarUrl={avatarUrl}
          avatarImage={avatarUrl === creator.avatarUrl ? creator.avatarImage : undefined}
          avatarFallback={avatarFallback}
          showsAvatarRing={showsAvatarRing}
          titleBadgeAccentColor={titleBadgeAccentColor}
        />

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-lg font-extrabold uppercase leading-tight tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {name}
            {creatorStatus === "APPROVED" && (
              <span
                role="img"
                aria-label="Approved muse"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-6"
              >
                <Check className="size-2.5 sm:size-3.5" strokeWidth={3} />
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground sm:mt-1 sm:text-sm">@{handle}</p>

          {titleBadge && (
            <CreatorTitleBadgePill
              titleBadge={titleBadge}
              titleBadgeAccentColor={titleBadgeAccentColor}
            />
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2">
            {heightCm && (
              <Badge variant="outline" showDot={false}>
                {formatHeight(heightCm)}
              </Badge>
            )}

            {featuredBadges.length > 0 && <CreatorFeaturedBadges featuredBadges={featuredBadges} />}
          </div>

          <CreatorProfileStats
            postsCount={postsCount}
            followerCount={followerCount}
            followingCount={followingCount}
            taggedPiecesCount={taggedPiecesCount}
            openFollowersModal={() => setFollowersModalOpen(true)}
            openFollowingModal={() => setFollowingModalOpen(true)}
          />
        </div>

        <CreatorProfileActions
          isOwnProfile={isOwnProfile}
          isStaff={isStaff}
          isFollowing={isFollowing}
          isStartingConversation={isStartingConversation}
          openEdit={openEdit}
          toggleFollow={toggleFollow}
          messageCreator={messageCreator}
          shareProfile={shareProfile}
        />
      </div>

      <ProfileBuildsTabs
        primaryTab="drops"
        primaryLabel="Drops"
        buildFilters={{ contributorId: userId }}
      >
        {isLoading ? (
          <CreatorPostGridSkeleton />
        ) : posts.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">No drops yet.</p>
        ) : (
          <Masonry
            breakpointCols={CREATOR_POST_GRID_BREAKPOINT_COLUMNS}
            className="-ml-4 flex w-auto"
            columnClassName="pl-4"
          >
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
          </Masonry>
        )}
      </ProfileBuildsTabs>

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
              <Button onClick={saveEdit} disabled={!canSaveHandle} isLoading={isSavingProfile}>
                Save
              </Button>
            </div>
          }
        >
          <EditCreatorProfileFields avatarFallback={avatarFallback} {...draftFields} />
        </Modal>
      )}

      {isOwnProfile && (
        <>
          <AddPostButton />
          <EditPostModal lookId={activeEditLookId} onClose={closeEdit} />
          <DeleteDropModal
            isOpen={deletingLookId !== null}
            isDeleting={deleteLook.isPending}
            closeDeleteModal={() => setDeletingLookId(null)}
            confirmDeletePost={confirmDeletePost}
          />
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
