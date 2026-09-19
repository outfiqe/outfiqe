"use client";

import { Tooltip } from "@outfiqe/design-system";
import { Bookmark, Flame, MessageCircle, Share2 } from "lucide-react";

import { cn } from "@/shared/lib/cn";

type PostActionsRowProps = {
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  isLiking?: boolean;
  likeDisabledReason?: string;
  commentCount: number;
  onCommentClick?: () => void;
  commentsOpen?: boolean;
  isSaved: boolean;
  onSave: () => void;
  isSaving?: boolean;
  onShare: () => void;
  className?: string;
};

export const PostActionsRow = ({
  isLiked,
  likeCount,
  onLike,
  isLiking,
  likeDisabledReason,
  commentCount,
  onCommentClick,
  commentsOpen,
  isSaved,
  onSave,
  isSaving,
  onShare,
  className,
}: PostActionsRowProps) => {
  const isLikeLocked = Boolean(likeDisabledReason);
  const likeButton = (
    <button
      type="button"
      onClick={isLikeLocked ? undefined : onLike}
      disabled={isLiking}
      aria-disabled={isLikeLocked || undefined}
      aria-pressed={isLiked}
      className={cn(
        "flex items-center gap-1.5 text-[12.5px] transition-colors disabled:cursor-default disabled:opacity-60",
        isLikeLocked ? "cursor-not-allowed text-muted-foreground opacity-60" : "cursor-pointer",
        !isLikeLocked &&
          (isLiked ? "text-primary-strong" : "text-muted-foreground hover:text-foreground"),
      )}
    >
      <Flame className={cn("size-5", isLiked && "fill-primary stroke-primary")} />
      {likeCount}
    </button>
  );

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {likeDisabledReason ? (
        <Tooltip content={likeDisabledReason}>{likeButton}</Tooltip>
      ) : (
        likeButton
      )}

      {onCommentClick ? (
        <button
          type="button"
          onClick={onCommentClick}
          aria-pressed={commentsOpen}
          className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
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

      <div className="ml-auto flex items-center gap-3.5">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          aria-pressed={isSaved}
          aria-label="Save post"
          className={cn(
            "flex cursor-pointer items-center gap-1.5 text-[12.5px] transition-colors disabled:cursor-default disabled:opacity-60",
            isSaved ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Bookmark className={cn("size-4", isSaved && "fill-foreground")} />
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label="Share post"
          className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Share2 className="size-4" />
        </button>
      </div>
    </div>
  );
};
