import type { Prisma } from "#generated/prisma/client.js";
import type { XpActivityType } from "#generated/prisma/enums.js";

export type LevelRecord = {
  id: string;
  level: number;
  name: string;
  requiredXp: number;
  icon: string | null;
};

export type ActivityXpConfigRecord = {
  activityType: XpActivityType;
  enabled: boolean;
  xpAmount: number;
  dailyLimit: number | null;
  cooldownSeconds: number | null;
  maxPerEntity: number | null;
};

export type AwardXpInput = {
  userId: string;
  activityType: XpActivityType;
  relatedEntityId?: string;
  source: string;
  metadata?: Prisma.InputJsonValue;
};

export type AwardXpSkipReason =
  "ACTIVITY_DISABLED" | "MAX_PER_ENTITY_REACHED" | "DAILY_LIMIT_REACHED" | "COOLDOWN_ACTIVE";

export type AwardXpResult =
  | {
      awarded: true;
      amount: number;
      totalXp: number;
      previousLevel: LevelRecord;
      currentLevel: LevelRecord;
      leveledUp: boolean;
    }
  | { awarded: false; reason: AwardXpSkipReason };

export type LevelProgress = {
  level: LevelRecord;
  nextLevel: LevelRecord | null;
};

export type UserProgressView = {
  totalXp: number;
  level: LevelRecord;
  nextLevel: LevelRecord | null;
  xpToNextLevel: number | null;
};

export type XpTransactionView = {
  id: string;
  activityType: XpActivityType;
  amount: number;
  source: string;
  createdAt: string;
};

export type XpTransactionPage = {
  items: XpTransactionView[];
  nextCursor: string | null;
};
