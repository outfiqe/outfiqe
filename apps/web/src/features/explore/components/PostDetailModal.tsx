"use client";

import { Modal } from "@outfiqe/design-system";
import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";
import { type CSSProperties, useEffect } from "react";

import { getMediaRowHeightPx } from "@/shared/components/MediaFormShell";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { usePostCardState } from "../hooks/usePostCardState";
import { PostActionsRow } from "./PostActionsRow";
import { PostCardHeader } from "./PostCardHeader";
import { PostCarousel } from "./PostCarousel";
import { PostCommentsSection } from "./PostCommentsSection";
import { PostTagPill } from "./PostTagPill";
import { ReportContentModal } from "./ReportContentModal";

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
  const { id: creatorId, handle: creatorHandle, name: creatorName } = creator;
  const photoAspect = POST_LAYOUT_ASPECT[layout];

  const {
    isAuthenticated,
    isOwnPost,
    isAdmin,
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

  useEffect(() => {
    setCommentsOpen(true);
  }, [setCommentsOpen]);

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={`Post by ${creatorName}`}
      className="h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
    >
      <div
        className="-mx-6 -my-5 flex flex-col sm:h-[var(--modal-row-height)] sm:flex-row"
        style={{ "--modal-row-height": `${getMediaRowHeightPx(photoAspect)}px` } as CSSProperties}
      >
        <div className="shrink-0 border-b border-border sm:w-95 sm:border-b-0 sm:border-r">
          <PostCarousel
            images={images}
            fallbackColor={getAvatarColor(id)}
            aspectRatio={String(photoAspect)}
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

        <div className="flex min-h-0 flex-1 flex-col sm:overflow-y-auto">
          {showCreatorHeader && (
            <PostCardHeader
              creatorId={creatorId}
              creatorHandle={creatorHandle}
              creatorName={creatorName}
              isOwnPost={isOwnPost}
              isAdmin={isAdmin}
              isFollowingCreator={isFollowingCreator}
              onFollowToggle={() =>
                gated(() => toggleFollow({ creatorId, following: isFollowingCreator }))
              }
              isFollowToggling={isFollowToggling}
              onReport={() => setReportOpen(true)}
              className="shrink-0 border-b border-border py-3 pl-4 pr-14"
            />
          )}

          <div className="px-4 py-3.5">
            {taggedProducts.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {taggedProducts.map((tag) => (
                  <PostTagPill key={tag.id} lookId={id} tag={tag} />
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
              className="mt-2.5 border-t border-border pt-2.5"
            />
          </div>
        </div>
      </div>

      {reportOpen && (
        <ReportContentModal
          targetLabel="post"
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
