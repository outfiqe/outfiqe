"use client";

import { Modal } from "@outfiqe/design-system";
import { ANALYTICS_EVENTS, POST_LAYOUT_ASPECT } from "@outfiqe/utils";
import { type CSSProperties, useEffect } from "react";

import { useTrackView } from "@/features/analytics/hooks/useTrackView";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import { PostCommentsSection } from "../../comments/components/PostCommentsSection";
import type { FeedPost } from "../../feed/api/exploreFeedSchemas";
import { usePostCardState } from "../hooks/usePostCardState";
import { PostActionsRow } from "./PostActionsRow";
import { PostCardHeader } from "./PostCardHeader";
import { PostCarousel } from "./PostCarousel";
import { PostTagPill } from "./PostTagPill";
import { ReportContentModal } from "./ReportContentModal";

const MODAL_IMAGE_SIZES = "(min-width: 640px) 60vw, 100vw";

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
  const photoAspect = POST_LAYOUT_ASPECT[layout];

  const {
    isAuthenticated,
    isOwnPost,
    isStaff,
    likeDisabledReason,
    taggedProducts,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    shareLook,
    setCommentsOpen,
    draft,
    setDraft,
    comments,
    submitComment,
    reportOpen,
    setReportOpen,
    reportMutation,
  } = usePostCardState(post);
  const { isLoading: commentsLoading, data: commentsData } = comments;
  const { mutate: toggleLike, isPending: isLiking } = likeMutation;
  const { mutate: toggleSave, isPending: isSaving } = saveMutation;
  const { mutate: toggleFollow, isPending: isFollowToggling } = followMutation;
  const { mutate: submitReport, isPending: isReporting } = reportMutation;
  const hasCaptionContent = taggedProducts.length > 0 || Boolean(caption);
  useTrackView(ANALYTICS_EVENTS.LOOK_DETAIL_VIEW, { look_id: id, creator_id: creatorId }, id);

  useEffect(() => {
    setCommentsOpen(true);
  }, [setCommentsOpen]);

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={`Drop by ${creatorName}`}
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[92dvh] sm:w-fit sm:max-w-[94vw] sm:rounded-2xl"
    >
      <div className="-mx-6 -my-5 flex flex-col sm:h-[min(92dvh,54rem)] sm:flex-row">
        <div
          className="flex shrink-0 items-center border-b border-border bg-black sm:w-[calc(min(92dvh,54rem)*var(--post-photo-aspect))] sm:max-w-[calc(94vw-26rem)] sm:border-b-0 sm:border-r"
          style={{ "--post-photo-aspect": photoAspect } as CSSProperties}
        >
          <PostCarousel
            images={images}
            fallbackColor={getAvatarColor(id)}
            aspectRatio={String(photoAspect)}
            sizes={MODAL_IMAGE_SIZES}
            className="w-full"
            imageFrameClassName="max-h-[55dvh] bg-black sm:max-h-full"
            showsWholeImage
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

        <div className="flex min-h-0 flex-1 flex-col sm:w-[26rem] sm:flex-none">
          {showCreatorHeader && (
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
              className="shrink-0 border-b border-border py-3 pl-4 pr-14"
            />
          )}

          <div className="flex min-h-0 flex-1 flex-col px-4 pt-3.5 sm:overflow-y-auto">
            {taggedProducts.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {taggedProducts.map((tag) => (
                  <PostTagPill
                    key={tag.id}
                    lookId={id}
                    tag={tag}
                    creatorHeightCm={creatorHeightCm}
                  />
                ))}
              </div>
            )}

            {caption && <p className="text-[13.5px] leading-relaxed text-foreground">{caption}</p>}

            <PostActionsRow
              isLiked={isLiked}
              likeCount={likeCount}
              onLike={() => gated(() => toggleLike({ lookId: id, liked: isLiked }))}
              isLiking={isLiking}
              likeDisabledReason={likeDisabledReason}
              commentCount={commentCount}
              isSaved={isSaved}
              onSave={() => gated(() => toggleSave({ lookId: id, saved: isSaved }))}
              isSaving={isSaving}
              onShare={() => void shareLook()}
              className={hasCaptionContent ? "mt-2.5 border-t border-border pt-2.5" : undefined}
            />

            <PostCommentsSection
              lookId={id}
              isLoading={commentsLoading}
              comments={commentsData?.comments}
              isAuthenticated={isAuthenticated}
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={() => gated(() => void submitComment())}
              className="mt-2.5 flex flex-1 flex-col border-t border-border pt-2.5"
              composerClassName="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-card px-4 py-3"
            />
          </div>
        </div>
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
    </Modal>
  );
};
