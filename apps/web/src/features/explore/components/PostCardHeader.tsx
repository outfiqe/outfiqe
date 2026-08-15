"use client";

import Link from "next/link";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

type PostCardHeaderProps = {
  creatorId: string;
  creatorHandle: string;
  creatorName: string;
  isOwnPost: boolean;
  isFollowingCreator: boolean;
  onFollowToggle: () => void;
  className?: string;
};

export const PostCardHeader = ({
  creatorId,
  creatorHandle,
  creatorName,
  isOwnPost,
  isFollowingCreator,
  onFollowToggle,
  className,
}: PostCardHeaderProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link href={`/creator/${creatorHandle}`} className="shrink-0">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: getAvatarColor(creatorId) }}
        >
          {initialsFor(creatorName)}
        </span>
      </Link>
      <Link href={`/creator/${creatorHandle}`} className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold text-foreground">{creatorName}</p>
        <p className="truncate text-[11px] text-muted-foreground">@{creatorHandle}</p>
      </Link>

      {!isOwnPost && (
        <button
          type="button"
          onClick={onFollowToggle}
          aria-pressed={isFollowingCreator}
          className={cn(
            "ml-auto shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            isFollowingCreator
              ? "border-foreground bg-foreground text-background"
              : "border-foreground text-foreground hover:bg-foreground hover:text-background",
          )}
        >
          {isFollowingCreator ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
};
