"use client";

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

export const CreatorLeaderboardTabs = ({ category, onChange }: CreatorLeaderboardTabsProps) => {
  const { data: categories } = useCreatorLeaderboardCategories();
  const enabledCategories = (categories ?? []).filter((row) => row.enabled);

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
