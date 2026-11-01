"use client";

import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";

import { type TrendingRank, TrendingRankBadge } from "@/shared/components/TrendingRankBadge";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import { LIST_POST_MEDIA_CLASS_NAME } from "../../constants/explore.constants";
import type { FeedPost } from "../../feed/api/exploreFeedSchemas";
import { usePostCardState } from "../hooks/usePostCardState";
import { useRecordLookView } from "../hooks/useRecordLookView";
import { PostActionsRow } from "./PostActionsRow";
import { PostCaption } from "./PostCaption";
import { PostCardHeader } from "./PostCardHeader";
import { PostCarousel } from "./PostCarousel";
import { PostTagPill } from "./PostTagPill";
import { ReportContentModal } from "./ReportContentModal";

interface PostCardProps {
  post: FeedPost;
  onImageClick?: () => void;
  onOpenComments: () => void;
  trendingRank?: TrendingRank;
}

export const PostCard = ({ post, onImageClick, onOpenComments, trendingRank }: PostCardProps) => {
  const {
    id,
    creator,
    images,
    layout,
    isFollowingCreator,
    caption,
    isLiked,
    likeCount,
    commentCount,
    isSaved,
  } = post;
  const {
    id: creatorId,
    handle: creatorHandle,
    name: creatorName,
    heightCm: creatorHeightCm,
  } = creator;

  const {
    isOwnPost,
    isStaff,
    likeDisabledReason,
    taggedProducts,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    shareLook,
    reportOpen,
    setReportOpen,
    reportMutation,
  } = usePostCardState(post);
  const { mutate: toggleLike, isPending: isLiking } = likeMutation;
  const { mutate: toggleSave, isPending: isSaving } = saveMutation;
  const { mutate: toggleFollow, isPending: isFollowToggling } = followMutation;
  const { mutate: submitReport, isPending: isReporting } = reportMutation;
  const cardRef = useRecordLookView(id, !isOwnPost);
  const hasCaptionContent = taggedProducts.length > 0 || Boolean(caption);

  return (
    <article
      ref={cardRef}
      className="mb-4 overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30"
    >
      <PostCardHeader
        creatorId={creatorId}
        creatorHandle={creatorHandle}
        creatorName={creatorName}
        isOwnPost={isOwnPost}
        isStaff={isStaff}
        isFollowingCreator={isFollowingCreator}
        onFollowToggle={() =>
          gated(() => toggleFollow({ creatorId, following: isFollowingCreator }))
        }
        isFollowToggling={isFollowToggling}
        onReport={() => setReportOpen(true)}
        className="px-3 py-2.5"
      />

      <div className="relative">
        {trendingRank && <TrendingRankBadge rank={trendingRank} />}
        <PostCarousel
          images={images}
          fallbackColor={getAvatarColor(id)}
          aspectRatio={String(POST_LAYOUT_ASPECT[layout])}
          imageFrameClassName={LIST_POST_MEDIA_CLASS_NAME}
          showsWholeImage
          onImageClick={onImageClick}
          onDoubleTapLike={
            likeDisabledReason
              ? undefined
              : () =>
                  gated(() => {
                    if (!isLiked && !isLiking) toggleLike({ lookId: id, liked: isLiked });
                  })
          }
        />
      </div>

      <div className="px-3 py-2.5">
        {taggedProducts.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {taggedProducts.map((tag) => (
              <PostTagPill key={tag.id} lookId={id} tag={tag} creatorHeightCm={creatorHeightCm} />
            ))}
          </div>
        )}

        {caption && (
          <PostCaption
            text={caption}
            className="text-[13.5px] leading-relaxed text-muted-foreground"
          />
        )}

        <PostActionsRow
          isLiked={isLiked}
          likeCount={likeCount}
          onLike={() => gated(() => toggleLike({ lookId: id, liked: isLiked }))}
          isLiking={isLiking}
          likeDisabledReason={likeDisabledReason}
          commentCount={commentCount}
          onCommentClick={isStaff ? undefined : onOpenComments}
          isSaved={isSaved}
          onSave={() => gated(() => toggleSave({ lookId: id, saved: isSaved }))}
          isSaving={isSaving}
          onShare={() => void shareLook()}
          className={hasCaptionContent ? "mt-2.5 border-t border-border pt-2.5" : undefined}
        />
      </div>

      {reportOpen && (
        <ReportContentModal
          targetLabel="drop"
          isPending={isReporting}
          onConfirm={(input) =>
            submitReport({ targetType: "CREATOR_LOOK", targetId: id, ...input })
          }
          onCancel={() => setReportOpen(false)}
        />
      )}
    </article>
  );
};
