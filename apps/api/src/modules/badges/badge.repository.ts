import { prisma } from "#db/prisma.js";
import { AchievementRequirementType } from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import type { DbClient } from "#types/db.types.js";

import type { CreateBadgeBody, RemoveUserBadgeBody, UpdateBadgeBody } from "./badge.schemas.js";
import type {
  AwardBadgeInput,
  AwardBadgeResult,
  BadgeAdminRecord,
  BadgeCatalogRecord,
  BadgeOwnerRecord,
  FeaturedBadgeRecord,
  ManualAwardRecord,
  MostAwardedBadgeRecord,
  UserBadgeStateRecord,
} from "./badge.types.js";

const requirementConfigFor = (input: CreateBadgeBody | UpdateBadgeBody) =>
  input.requirementType === AchievementRequirementType.ADMIN_AWARD
    ? { conditions: [] }
    : { conditions: input.conditions };

const seasonalWindowFor = (input: CreateBadgeBody | UpdateBadgeBody) =>
  input.requirementType === AchievementRequirementType.ADMIN_AWARD
    ? { activeFrom: null, activeUntil: null }
    : {
        activeFrom: input.activeFrom ? new Date(input.activeFrom) : null,
        activeUntil: input.activeUntil ? new Date(input.activeUntil) : null,
      };

const sponsorBrandSelect = { select: { id: true, name: true, avatarUrl: true } } as const;

export const badgeRepository = {
  async listActiveBadges(): Promise<BadgeCatalogRecord[]> {
    return prisma.badge.findMany({
      where: { isActive: true },
      include: { sponsorBrand: sponsorBrandSelect },
      orderBy: [{ category: "asc" }, { rarity: "asc" }, { name: "asc" }],
    });
  },

  async listUserBadgeStates(userId: string): Promise<UserBadgeStateRecord[]> {
    return prisma.userBadge.findMany({
      where: { userId, removedAt: null },
      select: {
        badgeId: true,
        isDisplayed: true,
        isFeatured: true,
        displayOrder: true,
        unlockedAt: true,
        isDynamicallyEligible: true,
      },
    });
  },

  async updateDisplay(userId: string, badgeId: string, isDisplayed: boolean): Promise<boolean> {
    const result = await prisma.userBadge.updateMany({
      where: { userId, badgeId, removedAt: null },
      data: isDisplayed ? { isDisplayed } : { isDisplayed, isTitle: false },
    });
    return result.count > 0;
  },

  async findOwnedBadgeIds(userId: string, badgeIds: string[]): Promise<Set<string>> {
    const rows = await prisma.userBadge.findMany({
      where: { userId, badgeId: { in: badgeIds }, removedAt: null },
      select: { badgeId: true },
    });
    return new Set(rows.map((row) => row.badgeId));
  },

  async clearFeatured(client: DbClient, userId: string): Promise<void> {
    await client.userBadge.updateMany({
      where: { userId, isFeatured: true },
      data: { isFeatured: false, displayOrder: 0 },
    });
  },

  async setFeatured(
    client: DbClient,
    userId: string,
    badgeId: string,
    displayOrder: number,
  ): Promise<void> {
    await client.userBadge.updateMany({
      where: { userId, badgeId },
      data: { isFeatured: true, displayOrder },
    });
  },

  async listFeaturedForUser(userId: string): Promise<FeaturedBadgeRecord[]> {
    const rows = await prisma.userBadge.findMany({
      where: {
        userId,
        removedAt: null,
        isFeatured: true,
        isDisplayed: true,
        OR: [{ isDynamicallyEligible: true }, { badge: { isDynamic: false } }],
      },
      orderBy: { displayOrder: "asc" },
      include: { badge: true },
    });
    return rows.map(({ badge }) => ({
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      designConfig: badge.designConfig,
      rarity: badge.rarity,
    }));
  },

  async findTitleForUser(userId: string): Promise<FeaturedBadgeRecord | null> {
    const row = await prisma.userBadge.findFirst({
      where: {
        userId,
        removedAt: null,
        isTitle: true,
        isDisplayed: true,
        OR: [{ isDynamicallyEligible: true }, { badge: { isDynamic: false } }],
      },
      include: { badge: true },
    });
    if (!row) return null;

    const { badge } = row;
    return {
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      designConfig: badge.designConfig,
      rarity: badge.rarity,
    };
  },

  async findOwnedTitleEligibleBadgeId(userId: string, badgeId: string): Promise<string | null> {
    const row = await prisma.userBadge.findFirst({
      where: { userId, badgeId, removedAt: null, badge: { isTitleEligible: true } },
      select: { badgeId: true },
    });
    return row?.badgeId ?? null;
  },

  async clearTitle(client: DbClient, userId: string): Promise<void> {
    await client.userBadge.updateMany({
      where: { userId, isTitle: true },
      data: { isTitle: false },
    });
  },

  async setTitle(client: DbClient, userId: string, badgeId: string): Promise<void> {
    await client.userBadge.updateMany({
      where: { userId, badgeId },
      data: { isTitle: true },
    });
  },

  async awardBadge(input: AwardBadgeInput): Promise<AwardBadgeResult> {
    const badge = await prisma.badge.findUnique({
      where: { id: input.badgeId },
      select: {
        id: true,
        isActive: true,
        assignmentLimit: true,
        xpReward: true,
        name: true,
        icon: true,
        sponsorBrand: { select: { name: true } },
      },
    });
    if (!badge) return { awarded: false, reason: "BADGE_NOT_FOUND" };
    if (!badge.isActive) return { awarded: false, reason: "BADGE_INACTIVE" };

    const alreadyOwned = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: input.userId, badgeId: input.badgeId } },
      select: { id: true },
    });
    if (alreadyOwned) return { awarded: false, reason: "ALREADY_AWARDED" };

    return prisma.$transaction(async (tx) => {
      if (badge.assignmentLimit !== null) {
        const { count } = await tx.badge.updateMany({
          where: { id: badge.id, assignmentCount: { lt: badge.assignmentLimit } },
          data: { assignmentCount: { increment: 1 } },
        });
        if (count === 0) return { awarded: false, reason: "ASSIGNMENT_LIMIT_REACHED" };
      }

      try {
        const userBadge = await tx.userBadge.create({
          data: {
            userId: input.userId,
            badgeId: input.badgeId,
            awardedById: input.awardedById,
            awardReason: input.awardReason,
          },
        });
        return {
          awarded: true,
          userBadgeId: userBadge.id,
          xpReward: badge.xpReward,
          badgeName: badge.name,
          badgeIcon: badge.icon,
          sponsorBrandName: badge.sponsorBrand?.name ?? null,
        };
      } catch (error) {
        if (isUniqueConstraintError(error)) return { awarded: false, reason: "ALREADY_AWARDED" };
        throw error;
      }
    });
  },

  async listOwnersOfBadge(badgeId: string): Promise<BadgeOwnerRecord[]> {
    return prisma.userBadge.findMany({
      where: { badgeId, removedAt: null },
      select: { userId: true, isDynamicallyEligible: true },
    });
  },

  async setDynamicEligibility(
    userId: string,
    badgeId: string,
    isDynamicallyEligible: boolean,
  ): Promise<void> {
    await prisma.userBadge.updateMany({
      where: { userId, badgeId, removedAt: null },
      data: { isDynamicallyEligible },
    });
  },

  async listAllBadgesAdmin(): Promise<BadgeAdminRecord[]> {
    return prisma.badge.findMany({
      include: { achievement: true, sponsorBrand: sponsorBrandSelect },
      orderBy: [{ category: "asc" }, { rarity: "asc" }, { name: "asc" }],
    });
  },

  async findBadgeAdminById(badgeId: string): Promise<BadgeAdminRecord | null> {
    return prisma.badge.findUnique({
      where: { id: badgeId },
      include: { achievement: true, sponsorBrand: sponsorBrandSelect },
    });
  },

  async createBadgeWithAchievement(input: CreateBadgeBody): Promise<BadgeAdminRecord> {
    return prisma.badge.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        rarity: input.rarity,
        icon: input.icon,
        designConfig: input.designConfig,
        xpReward: input.xpReward,
        isPermanent: input.isPermanent,
        isDynamic: input.isDynamic,
        isPublic: input.isPublic,
        isTitleEligible: input.isTitleEligible,
        assignmentLimit: input.assignmentLimit,
        sponsorBrandId: input.sponsorBrandId,
        achievement: {
          create: {
            name: input.name,
            description: input.description,
            requirementType: input.requirementType,
            requirementConfig: requirementConfigFor(input),
            ...seasonalWindowFor(input),
          },
        },
      },
      include: { achievement: true, sponsorBrand: sponsorBrandSelect },
    });
  },

  async updateBadgeWithAchievement(
    badgeId: string,
    input: UpdateBadgeBody,
  ): Promise<BadgeAdminRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.badge.update({
        where: { id: badgeId },
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          rarity: input.rarity,
          icon: input.icon,
          designConfig: input.designConfig,
          xpReward: input.xpReward,
          isPermanent: input.isPermanent,
          isDynamic: input.isDynamic,
          isPublic: input.isPublic,
          isTitleEligible: input.isTitleEligible,
          assignmentLimit: input.assignmentLimit,
          isActive: input.isActive,
          sponsorBrandId: input.sponsorBrandId,
        },
      });
      await tx.achievement.update({
        where: { badgeId },
        data: {
          name: input.name,
          description: input.description,
          requirementType: input.requirementType,
          requirementConfig: requirementConfigFor(input),
          isActive:
            input.requirementType === AchievementRequirementType.ADMIN_AWARD
              ? true
              : input.achievementIsActive,
          ...seasonalWindowFor(input),
        },
      });
      return tx.badge.findUniqueOrThrow({
        where: { id: badgeId },
        include: { achievement: true, sponsorBrand: sponsorBrandSelect },
      });
    });
  },

  async removeUserBadge(userBadgeId: string, { reason }: RemoveUserBadgeBody): Promise<boolean> {
    const result = await prisma.userBadge.updateMany({
      where: { id: userBadgeId, removedAt: null },
      data: { removedAt: new Date(), removedReason: reason },
    });
    return result.count > 0;
  },

  async countAwardedBadges(): Promise<number> {
    return prisma.userBadge.count({ where: { removedAt: null } });
  },

  async countManualAwardedBadges(): Promise<number> {
    return prisma.userBadge.count({ where: { removedAt: null, awardedById: { not: null } } });
  },

  async countEngineAwardedBadges(): Promise<number> {
    return prisma.userBadge.count({ where: { removedAt: null, awardedById: null } });
  },

  async listManualAwards(): Promise<ManualAwardRecord[]> {
    const rows = await prisma.userBadge.findMany({
      where: { removedAt: null, awardedById: { not: null } },
      orderBy: { unlockedAt: "desc" },
      include: { user: true, badge: true },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user.name,
      userHandle: row.user.handle,
      badgeId: row.badgeId,
      badgeName: row.badge.name,
      badgeIcon: row.badge.icon,
      awardReason: row.awardReason,
      unlockedAt: row.unlockedAt,
    }));
  },

  async findMostAwardedBadge(): Promise<MostAwardedBadgeRecord | null> {
    const grouped = await prisma.userBadge.groupBy({
      by: ["badgeId"],
      where: { removedAt: null },
      _count: { badgeId: true },
      orderBy: { _count: { badgeId: "desc" } },
      take: 1,
    });
    const top = grouped[0];
    if (!top) return null;

    const badge = await prisma.badge.findUnique({
      where: { id: top.badgeId },
      select: { name: true },
    });
    if (!badge) return null;

    return { badgeId: top.badgeId, name: badge.name, count: top._count.badgeId };
  },
};
