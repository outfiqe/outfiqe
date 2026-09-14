"use client";

import { Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { formatRelativeTime } from "@/shared/lib/formatRelativeTime";

import type { FeedComment, FeedCommentReply } from "../api/exploreFeedSchemas";
import { useCommentReplies } from "../hooks/useCommentReplies";
import { useDeleteComment } from "../hooks/useDeleteComment";
import { useReportContent } from "../hooks/useReportContent";
import { ConfirmDeleteCommentModal } from "./ConfirmDeleteCommentModal";
import { CommentAvatar } from "./PostCommentsSection";
import { ReportContentModal } from "./ReportContentModal";

type CommentThreadProps = {
  lookId: string;
  comment: FeedComment;
  isAuthenticated: boolean;
};

const CommentRowActions = ({
  isOwn,
  onDelete,
  onReport,
}: {
  isOwn: boolean;
  onDelete: () => void;
  onReport: () => void;
}) =>
  isOwn ? (
    <button
      type="button"
      onClick={onDelete}
      className="cursor-pointer text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
    >
      Delete
    </button>
  ) : (
    <button
      type="button"
      onClick={onReport}
      className="cursor-pointer text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
    >
      Report
    </button>
  );

const ReplyRow = ({ lookId, reply }: { lookId: string; reply: FeedCommentReply }) => {
  const { state } = useAuth();
  const isOwn = state.user?.id === reply.userId;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment(lookId);
  const { mutate: submitReport, isPending: isReporting } = useReportContent(() =>
    setReporting(false),
  );

  return (
    <li className="flex items-start gap-2.5">
      <CommentAvatar userId={reply.userId} name={reply.userName} avatarUrl={reply.userAvatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12.5px] font-semibold text-foreground">
            @{reply.userHandle}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(reply.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground">{reply.body}</p>
        <div className="mt-1">
          <CommentRowActions
            isOwn={isOwn}
            onDelete={() => setConfirmingDelete(true)}
            onReport={() => setReporting(true)}
          />
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDeleteCommentModal
          isPending={isDeleting}
          onConfirm={() =>
            deleteComment(
              { commentId: reply.id, parentCommentId: reply.parentCommentId, totalRemoved: 1 },
              { onSuccess: () => setConfirmingDelete(false) },
            )
          }
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {reporting && (
        <ReportContentModal
          targetLabel="comment"
          isPending={isReporting}
          onConfirm={(input) =>
            submitReport({ targetType: "CREATOR_LOOK_COMMENT", targetId: reply.id, ...input })
          }
          onCancel={() => setReporting(false)}
        />
      )}
    </li>
  );
};

export const CommentThread = ({ lookId, comment, isAuthenticated }: CommentThreadProps) => {
  const {
    id,
    userId,
    userName,
    userHandle,
    userAvatarUrl,
    body,
    createdAt,
    replyCount,
    previewReplies,
  } = comment;
  const { state } = useAuth();
  const isOwn = state.user?.id === userId;
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [replyBoxOpen, setReplyBoxOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment(lookId);
  const { mutate: submitReport, isPending: isReporting } = useReportContent(() =>
    setReporting(false),
  );

  const {
    data,
    isLoading: repliesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    draft,
    setDraft,
    submitReply,
  } = useCommentReplies(lookId, id, repliesExpanded);

  const loadedReplies = data?.pages.flatMap((page) => page.replies) ?? [];
  const displayedReplies = repliesExpanded ? loadedReplies : previewReplies;
  const hasMoreThanPreview = replyCount > previewReplies.length;

  return (
    <li className="flex items-start gap-3">
      <CommentAvatar userId={userId} name={userName} avatarUrl={userAvatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-foreground">@{userHandle}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">{body}</p>

        <div className="mt-1 flex items-center gap-3">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setReplyBoxOpen((open) => !open)}
              className="cursor-pointer text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
          <CommentRowActions
            isOwn={isOwn}
            onDelete={() => setConfirmingDelete(true)}
            onReport={() => setReporting(true)}
          />
        </div>

        {(displayedReplies.length > 0 || (repliesExpanded && repliesLoading)) && (
          <ul className="mt-2.5 flex flex-col gap-2.5 border-l border-border pl-3">
            {repliesExpanded && repliesLoading && (
              <li className="space-y-2" role="status" aria-label="Loading replies">
                <Skeleton className="h-3 w-3/5" />
              </li>
            )}
            {displayedReplies.map((reply) => (
              <ReplyRow key={reply.id} lookId={lookId} reply={reply} />
            ))}
          </ul>
        )}

        {!repliesExpanded && hasMoreThanPreview && (
          <button
            type="button"
            onClick={() => setRepliesExpanded(true)}
            className="mt-1.5 cursor-pointer text-[12px] font-semibold text-muted-foreground hover:text-foreground"
          >
            View {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {repliesExpanded && hasNextPage && (
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-1.5 cursor-pointer text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading…" : "Load more replies"}
          </button>
        )}

        {replyBoxOpen && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setRepliesExpanded(true);
              void submitReply();
            }}
            className="mt-2 flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Reply to @${userHandle}…`}
              className="min-w-0 flex-1 rounded-full border border-transparent bg-muted px-3 py-1.5 text-[12.5px] outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="shrink-0 cursor-pointer rounded-full bg-foreground px-3 py-1.5 text-[11.5px] font-semibold text-background disabled:cursor-default disabled:opacity-40"
            >
              Post
            </button>
          </form>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDeleteCommentModal
          isPending={isDeleting}
          onConfirm={() =>
            deleteComment(
              { commentId: id, parentCommentId: null, totalRemoved: 1 + replyCount },
              { onSuccess: () => setConfirmingDelete(false) },
            )
          }
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {reporting && (
        <ReportContentModal
          targetLabel="comment"
          isPending={isReporting}
          onConfirm={(input) =>
            submitReport({ targetType: "CREATOR_LOOK_COMMENT", targetId: id, ...input })
          }
          onCancel={() => setReporting(false)}
        />
      )}
    </li>
  );
};
