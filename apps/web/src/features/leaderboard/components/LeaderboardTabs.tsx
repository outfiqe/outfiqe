"use client";

import { cn } from "@/shared/lib/cn";

import { LEADERBOARD_TABS, type LeaderboardCategory } from "../leaderboard.constants";

type LeaderboardTabsProps = {
  category: LeaderboardCategory;
  onChange: (category: LeaderboardCategory) => void;
};

export const LeaderboardTabs = ({ category, onChange }: LeaderboardTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {LEADERBOARD_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-pressed={category === tab.value}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            category === tab.value
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
