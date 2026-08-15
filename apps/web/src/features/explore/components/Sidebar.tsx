"use client";

import { Skeleton } from "@outfiqe/design-system";
import Link from "next/link";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import { useExploreAuthGate } from "../hooks/useExploreAuthGate";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useSuggestedCreators } from "../hooks/useSuggestedCreators";
import { useTrendingTags } from "../hooks/useTrendingTags";

interface SidebarProps {
  onTagClick: (tag: string) => void;
}

export const Sidebar = ({ onTagClick }: SidebarProps) => {
  return (
    <aside className="sticky top-[76px] hidden h-fit flex-col gap-4 lg:flex">
      <SuggestedCreators />
      <TrendingTags onTagClick={onTagClick} />
    </aside>
  );
};

const SuggestedCreators = () => {
  const { isAuthenticated, isAuthResolved, goToSignIn } = useExploreAuthGate();
  const { data: creators, isLoading } = useSuggestedCreators();
  const followMutation = useFollowCreator();

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
        Creators to follow
      </h4>

      {isAuthResolved && !isAuthenticated && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          <button type="button" onClick={goToSignIn} className="font-semibold text-primary-strong">
            Sign in
          </button>{" "}
          to see who to follow.
        </p>
      )}

      {isAuthenticated && creators?.length === 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">No suggestions right now.</p>
      )}

      <div className="mt-3 flex flex-col">
        {(!isAuthResolved || isLoading) &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0"
            >
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}

        {creators?.map(({ id, handle, name, followerCount }) => (
          <div
            key={id}
            className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0"
          >
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
              onClick={() => followMutation.mutate({ creatorId: id, following: false })}
              className="ml-auto shrink-0 rounded-full border border-foreground px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendingTags = ({ onTagClick }: { onTagClick: (tag: string) => void }) => {
  const { data: tags, isLoading } = useTrendingTags();
  if (!isLoading && (!tags || tags.length === 0)) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
        Trending tags
      </h4>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {isLoading &&
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-16 rounded-full" />
          ))}

        {tags?.map(({ tag }) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className={cn(
              "rounded-full bg-muted px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
};
