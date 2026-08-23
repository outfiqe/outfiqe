"use client";

import { Skeleton } from "@outfiqe/design-system";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import type { FeedComment } from "../api/exploreFeedSchemas";
import { CommentThread } from "./CommentThread";

type PostCommentsSectionProps = {
  lookId: string;
  isLoading: boolean;
  comments: FeedComment[] | undefined;
  isAuthenticated: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
};

export type CommentAvatarProps = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export const CommentAvatar = ({ userId, name, avatarUrl }: CommentAvatarProps) => (
  <span
    aria-hidden
    className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-[11px] font-bold text-white"
    style={
      avatarUrl
        ? { backgroundImage: `url(${avatarUrl})` }
        : { backgroundColor: getAvatarColor(userId) }
    }
  >
    {!avatarUrl && initialsFor(name)}
  </span>
);

export const PostCommentsSection = ({
  lookId,
  isLoading,
  comments,
  isAuthenticated,
  draft,
  onDraftChange,
  onSubmit,
  className,
}: PostCommentsSectionProps) => {
  const { state } = useAuth();
  const currentUser = state.user;

  return (
    <div className={className}>
      {isLoading && (
        <div className="space-y-2" role="status" aria-label="Loading comments">
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      )}
      {comments?.length === 0 && (
        <p className="text-[12px] text-muted-foreground">No comments yet.</p>
      )}
      <ul className="flex flex-col gap-5">
        {comments?.map((comment) => (
          <CommentThread
            key={comment.id}
            lookId={lookId}
            comment={comment}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-5 flex items-center gap-3"
      >
        {currentUser && (
          <CommentAvatar
            userId={currentUser.id}
            name={currentUser.name}
            avatarUrl={currentUser.avatarUrl}
          />
        )}
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={isAuthenticated ? "Add a comment…" : "Sign in to comment"}
          disabled={!isAuthenticated}
          className={cn(
            "min-w-0 flex-1 rounded-full border border-transparent bg-muted px-3.5 py-2 text-[13px] outline-none focus:border-foreground",
            "disabled:opacity-60",
          )}
        />
        <button
          type="submit"
          disabled={!isAuthenticated || !draft.trim()}
          className="shrink-0 cursor-pointer rounded-full bg-foreground px-3.5 py-2 text-[12.5px] font-semibold text-background disabled:cursor-default disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </div>
  );
};
