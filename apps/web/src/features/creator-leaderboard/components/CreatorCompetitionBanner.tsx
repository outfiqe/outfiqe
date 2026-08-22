"use client";

import { AchievementBadgeIcon } from "@outfiqe/design-system";

import type { CreatorLeaderboardCategory } from "../creatorLeaderboard.constants";
import { useActiveCreatorCompetitions } from "../hooks/useActiveCreatorCompetitions";

export const CreatorCompetitionBanner = ({
  category,
}: {
  category: CreatorLeaderboardCategory;
}) => {
  const { data: competitions } = useActiveCreatorCompetitions();
  const competition = competitions?.find((row) => row.category === category);
  if (!competition) return null;

  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <AchievementBadgeIcon
        icon={competition.badge.icon}
        designConfig={competition.badge.designConfig}
        rarity={competition.badge.rarity}
        isLocked={false}
      />
      <div>
        <p className="text-sm font-semibold text-foreground">{competition.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The top {competition.topN} here each week win the &quot;{competition.badge.name}&quot;
          badge, automatically.
        </p>
      </div>
    </div>
  );
};
