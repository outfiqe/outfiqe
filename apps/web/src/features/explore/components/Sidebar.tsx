"use client";

import { Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { TRENDING_RANKS, TrendingRankChip } from "@/shared/components/TrendingRankBadge";

import { useExploreAuthGate } from "../hooks/useExploreAuthGate";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useSuggestedCreators } from "../hooks/useSuggestedCreators";
import { useTrendingTags } from "../hooks/useTrendingTags";
import { SuggestedCreatorRow, SuggestedCreatorRowSkeleton } from "./SuggestedCreatorRow";
import { SuggestedCreatorsModal } from "./SuggestedCreatorsModal";

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
  const [isFindMoreOpen, setIsFindMoreOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
          Creators to follow
        </h4>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setIsFindMoreOpen(true)}
            className="text-[11px] font-semibold text-primary-strong hover:underline"
          >
            Find more
          </button>
        )}
      </div>

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
          Array.from({ length: 4 }).map((_, index) => <SuggestedCreatorRowSkeleton key={index} />)}

        {creators?.map((creator) => (
          <SuggestedCreatorRow
            key={creator.id}
            creator={creator}
            onFollow={(creatorId) => followMutation.mutate({ creatorId, following: false })}
          />
        ))}
      </div>

      {isFindMoreOpen && <SuggestedCreatorsModal onClose={() => setIsFindMoreOpen(false)} />}
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

        {tags?.map(({ tag }, index) => {
          const rank = TRENDING_RANKS[index];

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {rank && <TrendingRankChip rank={rank} />}#{tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};
