"use client";

import { Button, Skeleton, Textarea, toast } from "@outfiqe/design-system";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { useAuth } from "@/features/auth";
import { ReportContentModal } from "@/features/explore/components/ReportContentModal";
import { useReportContent } from "@/features/explore/hooks/useReportContent";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BuildComment } from "../api/outfitSocialSchemas";
import {
  useAddBuildComment,
  useBuildComments,
  useBuildReplies,
  useRemoveBuildComment,
} from "../hooks/useBuildSocial";
import { formatNepalDateTime } from "../utils/outfitFormatting";
import { PersonAvatar } from "./PersonAvatar";

const COMMENT_MAX_LENGTH = 1000;
const NO_REPLIES = 0;
const NO_COMMENTS = 0;
const SKELETON_COMMENT_COUNT = 2;

const CommentComposer = ({
  outfitId,
  parentCommentId,
  onPosted,
}: {
  outfitId: string;
  parentCommentId?: string;
  onPosted?: () => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const inputId = useId();
  const [body, setBody] = useState("");
  const addComment = useAddBuildComment(outfitId);
  const trimmedBody = body.trim();

  const post = () =>
    addComment.mutate(
      { body: trimmedBody, parentCommentId },
      {
        onSuccess: () => {
          setBody("");
          onPosted?.();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        {parentCommentId ? t("replyLabel") : t("commentLabel")}
      </label>
      <Textarea
        id={inputId}
        rows={2}
        maxLength={COMMENT_MAX_LENGTH}
        value={body}
        placeholder={parentCommentId ? t("replyPlaceholder") : t("commentPlaceholder")}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button size="sm" disabled={!trimmedBody} isLoading={addComment.isPending} onClick={post}>
        {parentCommentId ? t("postReply") : t("postComment")}
      </Button>
    </div>
  );
};

const CommentRow = ({
  outfitId,
  comment,
  canReply,
}: {
  outfitId: string;
  comment: BuildComment;
  canReply: boolean;
}) => {
  const t = useTranslations("outfitBuild.public");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const [isShowingReplies, setIsShowingReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const removeComment = useRemoveBuildComment(outfitId);
  const reportComment = useReportContent(() => setIsReporting(false));
  const replies = useBuildReplies(outfitId, comment.id, isShowingReplies);
  const replyComments = replies.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <li className="space-y-2">
      <div className="flex gap-2">
        <PersonAvatar person={comment.author} className="size-7" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{comment.author.name}</span> {comment.body}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <time dateTime={comment.createdAt}>
              {formatNepalDateTime(comment.createdAt, locale)}
            </time>
            {canReply && !comment.parentCommentId && (
              <button
                type="button"
                className="cursor-pointer font-medium hover:text-foreground"
                onClick={() => setIsReplying((current) => !current)}
              >
                {t("reply")}
              </button>
            )}
            {comment.isMine && (
              <button
                type="button"
                className="cursor-pointer font-medium hover:text-foreground"
                onClick={() => removeComment.mutate(comment.id)}
              >
                {t("deleteComment")}
              </button>
            )}
            {isAuthenticated && !comment.isMine && (
              <button
                type="button"
                className="cursor-pointer font-medium hover:text-foreground"
                onClick={() => setIsReporting(true)}
              >
                {t("report")}
              </button>
            )}
          </p>
        </div>
      </div>

      {comment.replyCount > NO_REPLIES && !isShowingReplies && (
        <button
          type="button"
          className="ml-9 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setIsShowingReplies(true)}
        >
          {t("showReplies", { count: comment.replyCount })}
        </button>
      )}
      {isShowingReplies && (
        <ul className="ml-9 space-y-2">
          {replyComments.map((reply) => (
            <CommentRow key={reply.id} outfitId={outfitId} comment={reply} canReply={false} />
          ))}
        </ul>
      )}
      {isReplying && (
        <div className="ml-9">
          <CommentComposer
            outfitId={outfitId}
            parentCommentId={comment.id}
            onPosted={() => {
              setIsReplying(false);
              setIsShowingReplies(true);
            }}
          />
        </div>
      )}
      {isReporting && (
        <ReportContentModal
          targetLabel="comment"
          isPending={reportComment.isPending}
          onCancel={() => setIsReporting(false)}
          onConfirm={({ reason, note }) =>
            reportComment.mutate({
              targetType: "OUTFIT_BUILD_COMMENT",
              targetId: comment.id,
              reason,
              note,
            })
          }
        />
      )}
    </li>
  );
};

export const BuildComments = ({
  outfitId,
  canComment,
}: {
  outfitId: string;
  canComment: boolean;
}) => {
  const t = useTranslations("outfitBuild.public");
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useBuildComments(outfitId);
  const comments = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby={`build-comments-${outfitId}`} className="space-y-3">
      <h2 id={`build-comments-${outfitId}`} className="text-sm font-semibold text-foreground">
        {t("commentsTitle")}
      </h2>
      {canComment && <CommentComposer outfitId={outfitId} />}
      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading &&
          Array.from({ length: SKELETON_COMMENT_COUNT }, (_, index) => (
            <Skeleton key={index} className="mb-2 h-10 w-full rounded-lg" />
          ))}
        {isError && <p className="text-sm text-destructive">{t("commentsFailed")}</p>}
        {!isLoading && !isError && comments.length === NO_COMMENTS && (
          <p className="text-sm text-muted-foreground">{t("noComments")}</p>
        )}
        <ul className="space-y-3">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              outfitId={outfitId}
              comment={comment}
              canReply={canComment}
            />
          ))}
        </ul>
        {hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            isLoading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {t("moreComments")}
          </Button>
        )}
      </div>
    </section>
  );
};
