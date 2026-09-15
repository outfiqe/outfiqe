import { Button, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { useInfiniteLookComments } from "./hooks/useInfiniteLookComments";
import { useInfiniteLookReplies } from "./hooks/useInfiniteLookReplies";
import type { LookComment, LookCommentReply } from "./schemas";

type PostCommentsPanelProps = {
  lookId: string;
  onDeleteComment: (commentId: string, preview: string) => void;
  deletingCommentId: string | null;
};

type ReplyRowProps = {
  reply: LookCommentReply;
  onDeleteComment: (commentId: string, preview: string) => void;
  deletingCommentId: string | null;
};

const ReplyRow = ({ reply, onDeleteComment, deletingCommentId }: ReplyRowProps) => (
  <div className="flex items-start justify-between gap-3 border-l-2 border-border pl-3">
    <div className="min-w-0">
      <p className="text-xs font-medium text-foreground">@{reply.userHandle}</p>
      <p className="text-sm text-foreground">{reply.body}</p>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onDeleteComment(reply.id, reply.body)}
      disabled={deletingCommentId === reply.id}
      className="shrink-0"
    >
      {deletingCommentId === reply.id ? "Deleting…" : "Delete"}
    </Button>
  </div>
);

type CommentRepliesSectionProps = {
  lookId: string;
  comment: LookComment;
  onDeleteComment: (commentId: string, preview: string) => void;
  deletingCommentId: string | null;
};

const CommentRepliesSection = ({
  lookId,
  comment,
  onDeleteComment,
  deletingCommentId,
}: CommentRepliesSectionProps) => {
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const { previewReplies, replyCount } = comment;
  const hiddenReplyCount = replyCount - previewReplies.length;

  const {
    data: repliesQuery,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useInfiniteLookReplies(lookId, comment.id, repliesExpanded);
  const fullReplies = repliesQuery?.pages.flatMap((page) => page.replies) ?? [];
  const replies = repliesExpanded ? fullReplies : previewReplies;

  return (
    <div className="mt-2 space-y-2 pl-4">
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
          reply={reply}
          onDeleteComment={onDeleteComment}
          deletingCommentId={deletingCommentId}
        />
      ))}

      {!repliesExpanded && hiddenReplyCount > 0 && (
        <button
          type="button"
          onClick={() => setRepliesExpanded(true)}
          className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          View {hiddenReplyCount} more repl{hiddenReplyCount === 1 ? "y" : "ies"}
        </button>
      )}
      {repliesExpanded && isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {repliesExpanded && hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
        >
          Load more replies
        </Button>
      )}
    </div>
  );
};

export const PostCommentsPanel = ({
  lookId,
  onDeleteComment,
  deletingCommentId,
}: PostCommentsPanelProps) => {
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteLookComments(lookId, true);
  const comments = data?.pages.flatMap((page) => page.comments) ?? [];

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {isLoading && <Skeleton className="h-16 w-full rounded-lg" />}
      {error && <p className="text-sm text-destructive">Couldn&apos;t load comments.</p>}
      {!isLoading && !error && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments on this post.</p>
      )}

      {comments.map((comment) => (
        <div key={comment.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">@{comment.userHandle}</p>
              <p className="text-sm text-foreground">{comment.body}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteComment(comment.id, comment.body)}
              isLoading={deletingCommentId === comment.id}
              className="shrink-0"
            >
              Delete
            </Button>
          </div>
          {comment.replyCount > 0 && (
            <CommentRepliesSection
              lookId={lookId}
              comment={comment}
              onDeleteComment={onDeleteComment}
              deletingCommentId={deletingCommentId}
            />
          )}
        </div>
      ))}

      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
        >
          Load more comments
        </Button>
      )}
    </div>
  );
};
