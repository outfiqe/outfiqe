import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type ActivityXpConfig,
  activityXpConfigSchema,
  type AdjustXpResult,
  adjustXpResultSchema,
  type AwardBadgeResult,
  awardBadgeResultSchema,
  type BadgeAdmin,
  badgeAdminSchema,
  type BadgeStats,
  badgeStatsSchema,
  type ChallengeAdmin,
  challengeAdminSchema,
  type CreatorLeaderboardCategoryState,
  creatorLeaderboardCategoryStateSchema,
  type Level,
  levelSchema,
  type ManualAward,
  manualAwardSchema,
  type XpStats,
  xpStatsSchema,
} from "./schemas";

const levelListSchema = z.array(levelSchema);
const activityConfigListSchema = z.array(activityXpConfigSchema);
const badgeListSchema = z.array(badgeAdminSchema);
const manualAwardListSchema = z.array(manualAwardSchema);
const challengeListSchema = z.array(challengeAdminSchema);
const creatorLeaderboardCategoryListSchema = z.array(creatorLeaderboardCategoryStateSchema);

export type CreateLevelInput = {
  level: number;
  name: string;
  requiredXp: number;
  icon?: string;
};
export type UpdateLevelInput = Partial<Omit<CreateLevelInput, "level">> & { isActive?: boolean };

export type UpdateActivityXpConfigInput = Partial<{
  enabled: boolean;
  xpAmount: number;
  dailyLimit: number | null;
  cooldownSeconds: number | null;
  maxPerEntity: number | null;
}>;

export type BadgeFormInput = {
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  designConfig: { shape: string; primaryColor: string };
  xpReward: number;
  isPermanent: boolean;
  isDynamic: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
  assignmentLimit: number | null;
  requirementType: string;
  conditions?: { metric: string; operator: string; value: number }[];
  activeFrom?: string | null;
  activeUntil?: string | null;
};

export type UpdateBadgeFormInput = BadgeFormInput & {
  isActive: boolean;
  achievementIsActive?: boolean;
};

export type ChallengeFormInput = {
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  designConfig: { shape: string; primaryColor: string };
  xpReward: number;
  isPermanent: boolean;
  isPublic: boolean;
  isTitleEligible: boolean;
  requirementType: string;
  conditions: { metric: string; operator: string; value: number }[];
  activeFrom: string;
  activeUntil: string;
  challengeName: string;
  challengeDescription: string;
  bannerImageUrl: string | null;
};

export type UpdateChallengeFormInput = ChallengeFormInput & {
  isActive: boolean;
  achievementIsActive: boolean;
};

export const gamificationApi = {
  async listLevels(): Promise<Level[]> {
    const res = await apiClient.get<Level[]>("/xp/levels");
    return levelListSchema.parse(res.data);
  },

  async createLevel(input: CreateLevelInput): Promise<Level> {
    const res = await apiClient.post<Level>("/xp/levels", input);
    return levelSchema.parse(res.data);
  },

  async updateLevel(id: string, input: UpdateLevelInput): Promise<Level> {
    const res = await apiClient.patch<Level>(`/xp/levels/${id}`, input);
    return levelSchema.parse(res.data);
  },

  async listActivityConfigs(): Promise<ActivityXpConfig[]> {
    const res = await apiClient.get<ActivityXpConfig[]>("/xp/activity-config");
    return activityConfigListSchema.parse(res.data);
  },

  async updateActivityConfig(
    activityType: string,
    input: UpdateActivityXpConfigInput,
  ): Promise<ActivityXpConfig> {
    const res = await apiClient.patch<ActivityXpConfig>(
      `/xp/activity-config/${activityType}`,
      input,
    );
    return activityXpConfigSchema.parse(res.data);
  },

  async adjustXp(userId: string, amount: number, reason: string): Promise<AdjustXpResult> {
    const res = await apiClient.post<AdjustXpResult>("/xp/adjust", { userId, amount, reason });
    return adjustXpResultSchema.parse(res.data);
  },

  async getXpStats(): Promise<XpStats> {
    const res = await apiClient.get<XpStats>("/xp/stats");
    return xpStatsSchema.parse(res.data);
  },

  async listBadgesAdmin(): Promise<BadgeAdmin[]> {
    const res = await apiClient.get<BadgeAdmin[]>("/badges/admin");
    return badgeListSchema.parse(res.data);
  },

  async createBadge(input: BadgeFormInput): Promise<BadgeAdmin> {
    const res = await apiClient.post<BadgeAdmin>("/badges", input);
    return badgeAdminSchema.parse(res.data);
  },

  async updateBadge(badgeId: string, input: UpdateBadgeFormInput): Promise<BadgeAdmin> {
    const res = await apiClient.patch<BadgeAdmin>(`/badges/${badgeId}`, input);
    return badgeAdminSchema.parse(res.data);
  },

  async awardBadge(badgeId: string, userId: string, reason: string): Promise<AwardBadgeResult> {
    const res = await apiClient.post<AwardBadgeResult>(`/badges/${badgeId}/award`, {
      userId,
      reason,
    });
    return awardBadgeResultSchema.parse(res.data);
  },

  async removeUserBadge(userBadgeId: string, reason: string): Promise<void> {
    await apiClient.post(`/badges/user-badges/${userBadgeId}/remove`, { reason });
  },

  async listManualAwards(): Promise<ManualAward[]> {
    const res = await apiClient.get<ManualAward[]>("/badges/user-badges/manual");
    return manualAwardListSchema.parse(res.data);
  },

  async getBadgeStats(): Promise<BadgeStats> {
    const res = await apiClient.get<BadgeStats>("/badges/stats");
    return badgeStatsSchema.parse(res.data);
  },

  async listChallengesAdmin(): Promise<ChallengeAdmin[]> {
    const res = await apiClient.get<ChallengeAdmin[]>("/challenges/admin");
    return challengeListSchema.parse(res.data);
  },

  async createChallenge(input: ChallengeFormInput): Promise<ChallengeAdmin> {
    const res = await apiClient.post<ChallengeAdmin>("/challenges", input);
    return challengeAdminSchema.parse(res.data);
  },

  async updateChallenge(
    challengeId: string,
    input: UpdateChallengeFormInput,
  ): Promise<ChallengeAdmin> {
    const res = await apiClient.patch<ChallengeAdmin>(`/challenges/${challengeId}`, input);
    return challengeAdminSchema.parse(res.data);
  },

  async listCreatorLeaderboardCategories(): Promise<CreatorLeaderboardCategoryState[]> {
    const res = await apiClient.get<CreatorLeaderboardCategoryState[]>(
      "/creator-leaderboard/categories",
    );
    return creatorLeaderboardCategoryListSchema.parse(res.data);
  },

  async updateCreatorLeaderboardCategory(
    category: string,
    enabled: boolean,
  ): Promise<CreatorLeaderboardCategoryState> {
    const res = await apiClient.patch<CreatorLeaderboardCategoryState>(
      `/creator-leaderboard/categories/${category}`,
      { enabled },
    );
    return creatorLeaderboardCategoryStateSchema.parse(res.data);
  },
};
