"use client";

import { useLeaderboard } from "../hooks/useLeaderboard";
import type { LeaderboardCategory } from "../leaderboard.constants";
import { LeaderboardListSkeleton } from "./LeaderboardListSkeleton";
import { LeaderboardRow } from "./LeaderboardRow";

type LeaderboardListProps = {
  category: LeaderboardCategory;
};

export const LeaderboardList = ({ category }: LeaderboardListProps) => {
  const { data, isLoading, isError } = useLeaderboard(category);

  if (isLoading) return <LeaderboardListSkeleton />;

  if (isError) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Couldn&apos;t load the leaderboard.
      </p>
    );
  }

  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No brands ranked yet this week.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {entries.map((entry) => (
        <LeaderboardRow key={entry.brandId} entry={entry} />
      ))}
    </div>
  );
};
