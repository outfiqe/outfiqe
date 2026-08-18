"use client";

import { useLeaderboard } from "../hooks/useLeaderboard";
import type { LeaderboardCategory } from "../leaderboard.constants";
import { LeaderboardListSkeleton } from "./LeaderboardListSkeleton";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardRow } from "./LeaderboardRow";

const PODIUM_SIZE = 3;

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

  const podiumEntries = entries.slice(0, PODIUM_SIZE);
  const remainingEntries = entries.slice(PODIUM_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <LeaderboardPodium entries={podiumEntries} />

      {remainingEntries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          {remainingEntries.map((entry) => (
            <LeaderboardRow key={entry.brandId} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
};
