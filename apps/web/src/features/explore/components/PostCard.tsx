"use client";

import { getAvatarColor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { usePostCardState } from "../hooks/usePostCardState";
import { PostActionsRow } from "./PostActionsRow";
import { PostCardHeader } from "./PostCardHeader";
import { PostCarousel } from "./PostCarousel";
import { PostCommentsSection } from "./PostCommentsSection";
import { PostTagPill } from "./PostTagPill";

interface PostCardProps {
  post: FeedPost;
  onImageClick?: () => void;
}

export const PostCard = ({ post, onImageClick }: PostCardProps) => {
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
    primaryTag,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    commentsOpen,
    setCommentsOpen,
    draft,
    setDraft,
    comments,
    submitComment,
  } = usePostCardState(post);
  const { isLoading: commentsLoading, data: commentsData } = comments;

  return (
    <article className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30">
      <PostCardHeader
        creatorId={creatorId}
        creatorHandle={creatorHandle}
        creatorName={creatorName}
        isOwnPost={isOwnPost}
        isFollowingCreator={isFollowingCreator}
        onFollowToggle={() =>
          gated(() => followMutation.mutate({ creatorId, following: isFollowingCreator }))
        }
        className="px-3 py-2.5"
      />

      <div onClick={onImageClick} className={cn(onImageClick && "cursor-pointer")}>
        <PostCarousel images={images} fallbackColor={getAvatarColor(id)} aspectRatio="4 / 5" />
      </div>

      <div className="px-3 py-2.5">
        {primaryTag && <PostTagPill lookId={id} tag={primaryTag} className="mb-2" />}

        {caption && (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">{caption}</p>
        )}

        <PostActionsRow
          isLiked={isLiked}
          likeCount={likeCount}
          onLike={() => gated(() => likeMutation.mutate({ lookId: id, liked: isLiked }))}
          commentCount={commentCount}
          onCommentClick={() => setCommentsOpen((open) => !open)}
          commentsOpen={commentsOpen}
          isSaved={isSaved}
          onSave={() => gated(() => saveMutation.mutate({ lookId: id, saved: isSaved }))}
          className="mt-2.5 border-t border-border pt-2.5"
        />

        {commentsOpen && (
          <PostCommentsSection
            isLoading={commentsLoading}
            comments={commentsData?.comments}
            isAuthenticated={isAuthenticated}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={() => gated(() => void submitComment())}
            className="mt-2.5 border-t border-border pt-2.5"
          />
        )}
      </div>
    </article>
  );
};
