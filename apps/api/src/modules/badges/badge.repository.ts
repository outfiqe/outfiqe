import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type {
  BadgeCatalogRecord,
  FeaturedBadgeRecord,
  UserBadgeStateRecord,
} from "./badge.types.js";

export const badgeRepository = {
  async listActiveBadges(): Promise<BadgeCatalogRecord[]> {
    return prisma.badge.findMany({
      where: { isActive: true },
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
      },
    });
  },

  async updateDisplay(userId: string, badgeId: string, isDisplayed: boolean): Promise<boolean> {
    const result = await prisma.userBadge.updateMany({
      where: { userId, badgeId, removedAt: null },
      data: { isDisplayed },
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
      where: { userId, removedAt: null, isFeatured: true, isDisplayed: true },
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
};
