"use client";

import { Skeleton } from "@outfiqe/design-system";

import { cn } from "@/shared/lib/cn";

import {
  CREATOR_LEADERBOARD_CATEGORY_LABEL,
  type CreatorLeaderboardCategory,
} from "../creatorLeaderboard.constants";
import { useCreatorLeaderboardCategories } from "../hooks/useCreatorLeaderboardCategories";

type CreatorLeaderboardTabsProps = {
  category: CreatorLeaderboardCategory;
  onChange: (category: CreatorLeaderboardCategory) => void;
};

const PLACEHOLDER_TAB_COUNT = 4;

export const CreatorLeaderboardTabs = ({ category, onChange }: CreatorLeaderboardTabsProps) => {
  const { data: categories, isLoading } = useCreatorLeaderboardCategories();
  const enabledCategories = (categories ?? []).filter((row) => row.enabled);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading rankings" className="flex flex-wrap gap-2">
        {Array.from({ length: PLACEHOLDER_TAB_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-[38px] w-28 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {enabledCategories.map((row) => (
        <button
          key={row.category}
          type="button"
          onClick={() => onChange(row.category)}
          aria-pressed={category === row.category}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            category === row.category
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
          )}
        >
          {CREATOR_LEADERBOARD_CATEGORY_LABEL[row.category]}
        </button>
      ))}
    </div>
  );
};
