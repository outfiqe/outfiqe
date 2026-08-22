import type {
  AchievementRequirementType,
  BadgeCategory,
  BadgeRarity,
} from "#generated/prisma/enums.js";
import type { AchievementCondition } from "#modules/achievements/achievement.schemas.js";
import type { AchievementConditionProgress } from "#modules/achievements/achievement.types.js";

export type ChallengeBadgeRecord = {
  id: string;
  name: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xpReward: number;
  designConfig: unknown;
};

export type ChallengeAdminRecord = {
  id: string;
  name: string;
  description: string;
  bannerImageUrl: string | null;
  isActive: boolean;
  badge: ChallengeBadgeRecord & {
    description: string;
    isPermanent: boolean;
    isPublic: boolean;
    isTitleEligible: boolean;
  };
  achievement: {
    id: string;
    requirementType: AchievementRequirementType;
    conditions: AchievementCondition[];
    isActive: boolean;
    activeFrom: Date | null;
    activeUntil: Date | null;
  };
};

export type ChallengeStatus = "UPCOMING" | "OPEN" | "ENDED";

export type PublicChallengeView = {
  id: string;
  name: string;
  description: string;
  bannerImageUrl: string | null;
  status: ChallengeStatus;
  activeFrom: Date | null;
  activeUntil: Date | null;
  badge: ChallengeBadgeRecord;
  isCompleted: boolean | null;
  conditions: AchievementConditionProgress[] | null;
};
