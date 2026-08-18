import type { LeaderboardEntry } from "../api/leaderboardSchemas";
import { LeaderboardPodiumCard } from "./LeaderboardPodiumCard";

type LeaderboardPodiumProps = {
  entries: LeaderboardEntry[];
};

export const LeaderboardPodium = ({ entries }: LeaderboardPodiumProps) => {
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {entries.map((entry) => (
        <LeaderboardPodiumCard key={entry.brandId} entry={entry} />
      ))}
    </div>
  );
};
