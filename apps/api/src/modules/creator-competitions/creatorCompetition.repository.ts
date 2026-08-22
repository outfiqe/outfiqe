import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import type {
  CreateCreatorCompetitionBody,
  UpdateCreatorCompetitionBody,
} from "./creatorCompetition.schemas.js";
import type { CreatorCompetitionAdminRecord } from "./creatorCompetition.types.js";

const COMPETITION_INCLUDE = { badge: true } as const;

export type CreatorCompetitionRecordWithBadge = Prisma.CreatorCompetitionGetPayload<{
  include: typeof COMPETITION_INCLUDE;
}>;

const toAdminRecord = (
  competition: CreatorCompetitionRecordWithBadge,
): CreatorCompetitionAdminRecord => ({
  id: competition.id,
  name: competition.name,
  category: competition.category,
  topN: competition.topN,
  isActive: competition.isActive,
  badge: {
    id: competition.badge.id,
    name: competition.badge.name,
    description: competition.badge.description,
    icon: competition.badge.icon,
    category: competition.badge.category,
    rarity: competition.badge.rarity,
    designConfig: competition.badge.designConfig,
    xpReward: competition.badge.xpReward,
    isPermanent: competition.badge.isPermanent,
    isPublic: competition.badge.isPublic,
    isTitleEligible: competition.badge.isTitleEligible,
  },
});

export const creatorCompetitionRepository = {
  async createWithBadge(
    input: CreateCreatorCompetitionBody,
  ): Promise<CreatorCompetitionAdminRecord> {
    const competition = await prisma.creatorCompetition.create({
      data: {
        name: input.name,
        category: input.leaderboardCategory,
        topN: input.topN,
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
            isDynamic: false,
            isPublic: input.isPublic,
            isTitleEligible: input.isTitleEligible,
            assignmentLimit: null,
          },
        },
      },
      include: COMPETITION_INCLUDE,
    });
    return toAdminRecord(competition);
  },

  async updateWithBadge(
    competitionId: string,
    input: UpdateCreatorCompetitionBody,
  ): Promise<CreatorCompetitionAdminRecord> {
    const existing = await prisma.creatorCompetition.findUniqueOrThrow({
      where: { id: competitionId },
      select: { badgeId: true },
    });

    return prisma.$transaction(async (tx) => {
      await tx.badge.update({
        where: { id: existing.badgeId },
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
      const competition = await tx.creatorCompetition.update({
        where: { id: competitionId },
        data: {
          name: input.name,
          category: input.leaderboardCategory,
          topN: input.topN,
          isActive: input.isActive,
        },
        include: COMPETITION_INCLUDE,
      });
      return toAdminRecord(competition);
    });
  },

  async listAllAdmin(): Promise<CreatorCompetitionAdminRecord[]> {
    const competitions = await prisma.creatorCompetition.findMany({
      include: COMPETITION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return competitions.map(toAdminRecord);
  },

  async listActive(): Promise<CreatorCompetitionRecordWithBadge[]> {
    return prisma.creatorCompetition.findMany({
      where: { isActive: true, badge: { isActive: true } },
      include: COMPETITION_INCLUDE,
    });
  },
};
