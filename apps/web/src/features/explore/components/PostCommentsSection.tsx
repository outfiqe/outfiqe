"use client";

import { Skeleton } from "@outfiqe/design-system";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import type { FeedComment } from "../api/exploreFeedSchemas";

type PostCommentsSectionProps = {
  isLoading: boolean;
  comments: FeedComment[] | undefined;
  isAuthenticated: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
};

export const PostCommentsSection = ({
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
        <div className="space-y-1.5" role="status" aria-label="Loading comments">
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      )}
      {comments?.length === 0 && (
        <p className="text-[12px] text-muted-foreground">No comments yet.</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {comments?.map((comment) => (
          <li key={comment.id} className="text-[12.5px] leading-snug">
            <span className="font-semibold text-foreground">@{comment.userHandle}</span>{" "}
            <span className="text-muted-foreground">{comment.body}</span>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-2 flex items-center gap-2"
      >
        {currentUser && (
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-[10px] font-bold text-white"
            style={
              currentUser.avatarUrl
                ? { backgroundImage: `url(${currentUser.avatarUrl})` }
                : { backgroundColor: getAvatarColor(currentUser.id) }
            }
          >
            {!currentUser.avatarUrl && initialsFor(currentUser.name)}
          </span>
        )}
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={isAuthenticated ? "Add a comment…" : "Sign in to comment"}
          disabled={!isAuthenticated}
          className={cn(
            "min-w-0 flex-1 rounded-full border border-border bg-transparent px-3 py-1.5 text-[12.5px] outline-none focus:border-foreground",
            "disabled:opacity-60",
          )}
        />
        <button
          type="submit"
          disabled={!isAuthenticated || !draft.trim()}
          className="rounded-full bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </div>
  );
};
