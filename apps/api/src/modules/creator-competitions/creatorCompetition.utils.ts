import type { BadgeRarity, CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

import type { PublicCreatorCompetitionView } from "./creatorCompetition.types.js";

export type CompetitionForPublicView = {
  id: string;
  name: string;
  category: CreatorLeaderboardCategory;
  topN: number;
  badge: {
    id: string;
    name: string;
    icon: string;
    rarity: BadgeRarity;
    designConfig: unknown;
  };
};

export const toPublicView = (
  competition: CompetitionForPublicView,
): PublicCreatorCompetitionView => ({
  id: competition.id,
  name: competition.name,
  category: competition.category,
  topN: competition.topN,
  badge: {
    id: competition.badge.id,
    name: competition.badge.name,
    icon: competition.badge.icon,
    rarity: competition.badge.rarity,
    designConfig: competition.badge.designConfig,
  },
});
