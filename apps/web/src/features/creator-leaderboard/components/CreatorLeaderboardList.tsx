"use client";

import { LeaderboardListSkeleton } from "@/features/leaderboard";

import type { CreatorLeaderboardCategory } from "../creatorLeaderboard.constants";
import { useCreatorLeaderboard } from "../hooks/useCreatorLeaderboard";
import { CreatorLeaderboardPodium } from "./CreatorLeaderboardPodium";
import { CreatorLeaderboardRow } from "./CreatorLeaderboardRow";

const PODIUM_SIZE = 3;

type CreatorLeaderboardListProps = {
  category: CreatorLeaderboardCategory;
};

export const CreatorLeaderboardList = ({ category }: CreatorLeaderboardListProps) => {
  const { data, isLoading, isError } = useCreatorLeaderboard(category);

  if (isLoading) return <LeaderboardListSkeleton />;

  if (isError) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Couldn&apos;t load the leaderboard.
      </p>
    );
  }

  if (data && !data.isEnabled) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        This ranking isn&apos;t available right now.
      </p>
    );
  }

  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No creators ranked yet this week.
      </p>
    );
  }

  const podiumEntries = entries.slice(0, PODIUM_SIZE);
  const remainingEntries = entries.slice(PODIUM_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <CreatorLeaderboardPodium entries={podiumEntries} />

      {remainingEntries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          {remainingEntries.map((entry) => (
            <CreatorLeaderboardRow key={entry.creatorId} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
};
