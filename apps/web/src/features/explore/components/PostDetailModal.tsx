"use client";

import { Modal } from "@outfiqe/design-system";
import { useEffect } from "react";

import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { usePostCardState } from "../hooks/usePostCardState";
import { PostActionsRow } from "./PostActionsRow";
import { PostCardHeader } from "./PostCardHeader";
import { PostCarousel } from "./PostCarousel";
import { PostCommentsSection } from "./PostCommentsSection";
import { PostTagPill } from "./PostTagPill";

type PostDetailModalProps = {
  post: FeedPost;
  onClose: () => void;
  showCreatorHeader?: boolean;
};

export const PostDetailModal = ({
  post,
  onClose,
  showCreatorHeader = true,
}: PostDetailModalProps) => {
  const {
    id,
    creator,
    images,
    isFollowingCreator,
    caption,
    isLiked,
    likeCount,
    commentCount,
    isSaved,
  } = post;
  const { id: creatorId, handle: creatorHandle, name: creatorName } = creator;

  const {
    isAuthenticated,
    isOwnPost,
    taggedProducts,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    setCommentsOpen,
    draft,
    setDraft,
    comments,
    submitComment,
  } = usePostCardState(post);
  const { isLoading: commentsLoading, data: commentsData } = comments;
  const { mutate: toggleLike, isPending: isLiking } = likeMutation;
  const { mutate: toggleSave, isPending: isSaving } = saveMutation;

  useEffect(() => {
    setCommentsOpen(true);
  }, [setCommentsOpen]);

  return (
    <Modal open onClose={onClose} ariaLabel={`Post by ${creatorName}`} className="sm:max-w-xl">
      <div className="-mx-6 -my-5 max-h-[85vh] overflow-y-auto">
        {showCreatorHeader && (
          <PostCardHeader
            creatorId={creatorId}
            creatorHandle={creatorHandle}
            creatorName={creatorName}
            isOwnPost={isOwnPost}
            isFollowingCreator={isFollowingCreator}
            onFollowToggle={() =>
              gated(() => followMutation.mutate({ creatorId, following: isFollowingCreator }))
            }
            className="border-b border-border px-4 py-3"
          />
        )}

        <PostCarousel images={images} fallbackColor={getAvatarColor(id)} aspectRatio="4 / 5" />

        <div className="px-4 py-3">
          {taggedProducts.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {taggedProducts.map((tag) => (
                <PostTagPill key={tag.id} lookId={id} tag={tag} />
              ))}
            </div>
          )}

          {caption && (
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">{caption}</p>
          )}

          <PostActionsRow
            isLiked={isLiked}
            likeCount={likeCount}
            onLike={() => gated(() => toggleLike({ lookId: id, liked: isLiked }))}
            isLiking={isLiking}
            commentCount={commentCount}
            isSaved={isSaved}
            onSave={() => gated(() => toggleSave({ lookId: id, saved: isSaved }))}
            isSaving={isSaving}
            className="mt-2.5 border-t border-border pt-2.5"
          />

          <PostCommentsSection
            isLoading={commentsLoading}
            comments={commentsData?.comments}
            isAuthenticated={isAuthenticated}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={() => gated(() => void submitComment())}
            className="mt-2.5 border-t border-border pt-2.5"
          />
        </div>
      </div>
    </Modal>
  );
};
