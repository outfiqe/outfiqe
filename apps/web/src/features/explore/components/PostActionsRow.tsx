"use client";

import { Bookmark, Flame, MessageCircle } from "lucide-react";

import { cn } from "@/shared/lib/cn";

type PostActionsRowProps = {
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  isLiking?: boolean;
  commentCount: number;
  onCommentClick?: () => void;
  commentsOpen?: boolean;
  isSaved: boolean;
  onSave: () => void;
  isSaving?: boolean;
  className?: string;
};

export const PostActionsRow = ({
  isLiked,
  likeCount,
  onLike,
  isLiking,
  commentCount,
  onCommentClick,
  commentsOpen,
  isSaved,
  onSave,
  isSaving,
  className,
}: PostActionsRowProps) => {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={onLike}
        disabled={isLiking}
        aria-pressed={isLiked}
        className={cn(
          "flex items-center gap-1.5 text-[12.5px] transition-colors disabled:opacity-60",
          isLiked ? "text-primary-strong" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Flame className={cn("size-5", isLiked && "fill-primary stroke-primary")} />
        {likeCount}
      </button>

      {onCommentClick ? (
        <button
          type="button"
          onClick={onCommentClick}
          aria-pressed={commentsOpen}
          className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="size-5" />
          {commentCount}
        </button>
      ) : (
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <MessageCircle className="size-5" />
          {commentCount}
        </span>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        aria-pressed={isSaved}
        aria-label="Save post"
        className={cn(
          "ml-auto flex items-center gap-1.5 text-[12.5px] transition-colors disabled:opacity-60",
          isSaved ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Bookmark className={cn("size-4", isSaved && "fill-foreground")} />
      </button>
    </div>
  );
};
