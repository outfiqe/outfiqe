"use client";

import { Skeleton } from "@outfiqe/design-system";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";
import { formatRelativeTime } from "@/shared/lib/formatRelativeTime";

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

type CommentAvatarProps = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

const CommentAvatar = ({ userId, name, avatarUrl }: CommentAvatarProps) => (
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
        {comments?.map((comment) => {
          const { id, userId, userName, userHandle, userAvatarUrl, body, createdAt } = comment;

          return (
            <li key={id} className="flex items-start gap-3">
              <CommentAvatar userId={userId} name={userName} avatarUrl={userAvatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    @{userHandle}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">{body}</p>
              </div>
            </li>
          );
        })}
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
          className="shrink-0 rounded-full bg-foreground px-3.5 py-2 text-[12.5px] font-semibold text-background disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </div>
  );
};
