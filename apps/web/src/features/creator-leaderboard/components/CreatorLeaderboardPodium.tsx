import type { CreatorLeaderboardEntry } from "../api/creatorLeaderboardSchemas";
import { CreatorLeaderboardPodiumCard } from "./CreatorLeaderboardPodiumCard";

type CreatorLeaderboardPodiumProps = {
  entries: CreatorLeaderboardEntry[];
};

export const CreatorLeaderboardPodium = ({ entries }: CreatorLeaderboardPodiumProps) => {
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {entries.map((entry) => (
        <CreatorLeaderboardPodiumCard key={entry.creatorId} entry={entry} />
      ))}
    </div>
  );
};
