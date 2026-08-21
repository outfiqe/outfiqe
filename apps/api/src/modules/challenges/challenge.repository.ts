import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import logger from "#lib/winston.utils.js";
import { achievementRequirementConfigSchema } from "#modules/achievements/achievement.schemas.js";
import { collectLeafConditions } from "#modules/achievements/achievement.utils.js";

import type { CreateChallengeBody, UpdateChallengeBody } from "./challenge.schemas.js";
import type { ChallengeAdminRecord } from "./challenge.types.js";

const CHALLENGE_INCLUDE = { achievement: { include: { badge: true } } } as const;

export type ChallengeRecordWithAchievementAndBadge = Prisma.ChallengeGetPayload<{
  include: typeof CHALLENGE_INCLUDE;
}>;

const parseFlatConditions = (achievementId: string, requirementConfig: Prisma.JsonValue) => {
  const parsed = achievementRequirementConfigSchema.safeParse(requirementConfig);
  if (!parsed.success) {
    logger.error(
      `Challenge achievement ${achievementId} has an invalid requirementConfig: ${parsed.error.message}`,
    );
    return [];
  }
  return collectLeafConditions(parsed.data.conditions);
};

const toAdminRecord = (challenge: ChallengeRecordWithAchievementAndBadge): ChallengeAdminRecord => {
  const { achievement } = challenge;
  const { badge } = achievement;

  return {
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    bannerImageUrl: challenge.bannerImageUrl,
    isActive: challenge.isActive,
    badge: {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      xpReward: badge.xpReward,
      designConfig: badge.designConfig,
      isPermanent: badge.isPermanent,
      isPublic: badge.isPublic,
      isTitleEligible: badge.isTitleEligible,
    },
    achievement: {
      id: achievement.id,
      requirementType: achievement.requirementType,
      conditions: parseFlatConditions(achievement.id, achievement.requirementConfig),
      isActive: achievement.isActive,
      activeFrom: achievement.activeFrom,
      activeUntil: achievement.activeUntil,
    },
  };
};

export const challengeRepository = {
  async createChallengeWithAchievementAndBadge(
    input: CreateChallengeBody,
  ): Promise<ChallengeAdminRecord> {
    const challenge = await prisma.challenge.create({
      data: {
        name: input.challengeName,
        description: input.challengeDescription,
        bannerImageUrl: input.bannerImageUrl,
        achievement: {
          create: {
            name: input.name,
            description: input.description,
            requirementType: input.requirementType,
            requirementConfig: { conditions: input.conditions },
            activeFrom: new Date(input.activeFrom),
            activeUntil: new Date(input.activeUntil),
            badge: {
              create: {
                name: input.name,
                description: input.description,
                category: input.category,
                rarity: input.rarity,
                icon: input.icon,
                designConfig: input.designConfig,
                xpReward: input.xpReward,
                isPermanent: input.isPermanent,
                isPublic: input.isPublic,
                isTitleEligible: input.isTitleEligible,
                assignmentLimit: null,
              },
            },
          },
        },
      },
      include: CHALLENGE_INCLUDE,
    });
    return toAdminRecord(challenge);
  },

  async updateChallengeWithAchievementAndBadge(
    challengeId: string,
    input: UpdateChallengeBody,
  ): Promise<ChallengeAdminRecord> {
    const existing = await prisma.challenge.findUniqueOrThrow({
      where: { id: challengeId },
      select: { achievementId: true, achievement: { select: { badgeId: true } } },
    });

    return prisma.$transaction(async (tx) => {
      await tx.badge.update({
        where: { id: existing.achievement.badgeId },
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          rarity: input.rarity,
          icon: input.icon,
          designConfig: input.designConfig,
          xpReward: input.xpReward,
          isPermanent: input.isPermanent,
          isPublic: input.isPublic,
          isTitleEligible: input.isTitleEligible,
        },
      });
      await tx.achievement.update({
        where: { id: existing.achievementId },
        data: {
          name: input.name,
          description: input.description,
          requirementType: input.requirementType,
          requirementConfig: { conditions: input.conditions },
          isActive: input.achievementIsActive,
          activeFrom: new Date(input.activeFrom),
          activeUntil: new Date(input.activeUntil),
        },
      });
      const challenge = await tx.challenge.update({
        where: { id: challengeId },
        data: {
          name: input.challengeName,
          description: input.challengeDescription,
          bannerImageUrl: input.bannerImageUrl,
          isActive: input.isActive,
        },
        include: CHALLENGE_INCLUDE,
      });
      return toAdminRecord(challenge);
    });
  },

  async listAllChallengesAdmin(): Promise<ChallengeAdminRecord[]> {
    const challenges = await prisma.challenge.findMany({
      include: CHALLENGE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return challenges.map(toAdminRecord);
  },

  async listActiveChallenges(): Promise<ChallengeRecordWithAchievementAndBadge[]> {
    return prisma.challenge.findMany({
      where: { isActive: true, achievement: { badge: { isActive: true } } },
      include: CHALLENGE_INCLUDE,
      orderBy: [
        { achievement: { activeUntil: { sort: "asc", nulls: "last" } } },
        { createdAt: "desc" },
      ],
    });
  },

  async findActiveChallengeById(
    challengeId: string,
  ): Promise<ChallengeRecordWithAchievementAndBadge | null> {
    return prisma.challenge.findFirst({
      where: { id: challengeId, isActive: true, achievement: { badge: { isActive: true } } },
      include: CHALLENGE_INCLUDE,
    });
  },
};
