"use client";

import { Skeleton } from "@outfiqe/design-system";
import Link from "next/link";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";

import type { SuggestedCreator } from "../api/exploreFeedSchemas";

export const SuggestedCreatorRowSkeleton = () => (
  <div className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0">
    <Skeleton className="size-8 shrink-0 rounded-full" />
    <div className="min-w-0 flex-1 space-y-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  </div>
);

type SuggestedCreatorRowProps = {
  creator: SuggestedCreator;
  onFollow: (creatorId: string) => void;
};

export const SuggestedCreatorRow = ({ creator, onFollow }: SuggestedCreatorRowProps) => {
  const { id, handle, name, followerCount } = creator;

  return (
    <div className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0">
      <Link href={`/creator/${handle}`} className="shrink-0">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: getAvatarColor(id) }}
        >
          {initialsFor(name)}
        </span>
      </Link>
      <Link href={`/creator/${handle}`} className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
        <p className="text-[11.5px] text-muted-foreground">
          {followerCount.toLocaleString()} followers
        </p>
      </Link>
      <button
        type="button"
        onClick={() => onFollow(id)}
        className="ml-auto shrink-0 rounded-full border border-foreground px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        Follow
      </button>
    </div>
  );
};
