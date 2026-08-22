import type {
  BadgeCategory,
  BadgeRarity,
  CreatorLeaderboardCategory,
} from "#generated/prisma/enums.js";

export type CreatorCompetitionBadgeRecord = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  designConfig: unknown;
  xpReward: number;
  isPermanent: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
};

export type CreatorCompetitionAdminRecord = {
  id: string;
  name: string;
  category: CreatorLeaderboardCategory;
  topN: number;
  isActive: boolean;
  badge: CreatorCompetitionBadgeRecord;
};

export type PublicCreatorCompetitionView = {
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

export type SettlementOutcome = {
  competitionId: string;
  week: string;
  winners: { userId: string; rank: number }[];
};
