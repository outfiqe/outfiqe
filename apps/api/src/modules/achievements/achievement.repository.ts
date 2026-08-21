import { prisma } from "#db/prisma.js";
import {
  AchievementRequirementType,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";

export const achievementRepository = {
  async findEligibleAchievements(userId: string) {
    const now = new Date();
    return prisma.achievement.findMany({
      where: {
        isActive: true,
        requirementType: { not: AchievementRequirementType.ADMIN_AWARD },
        badge: { isActive: true, userBadges: { none: { userId } } },
        AND: [
          { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
          { OR: [{ activeUntil: null }, { activeUntil: { gte: now } }] },
        ],
      },
      include: { badge: true },
    });
  },

  async findActiveDynamicAchievements() {
    const now = new Date();
    return prisma.achievement.findMany({
      where: {
        isActive: true,
        requirementType: { not: AchievementRequirementType.ADMIN_AWARD },
        badge: { isActive: true, isDynamic: true },
        AND: [
          { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
          { OR: [{ activeUntil: null }, { activeUntil: { gte: now } }] },
        ],
      },
      include: { badge: true },
    });
  },

  async countActiveLooks(userId: string): Promise<number> {
    return prisma.creatorLook.count({ where: { creatorId: userId, deletedAt: null } });
  },

  async sumLikesReceived(userId: string): Promise<number> {
    const { _sum } = await prisma.creatorLook.aggregate({
      where: { creatorId: userId, deletedAt: null },
      _sum: { likeCount: true },
    });
    return _sum.likeCount ?? 0;
  },

  async countCommentsMade(userId: string): Promise<number> {
    return prisma.creatorLookComment.count({ where: { userId, deletedAt: null } });
  },

  async countPurchases(userId: string): Promise<number> {
    return prisma.order.count({
      where: {
        userId,
        OR: [{ paymentMethod: PaymentMethod.COD }, { paymentStatus: PaymentStatus.PAID }],
      },
    });
  },

  async countSalesGenerated(userId: string): Promise<number> {
    return prisma.creatorCommission.count({ where: { creatorId: userId } });
  },

  async sumViewsReceived(userId: string): Promise<number> {
    const { _sum } = await prisma.creatorLook.aggregate({
      where: { creatorId: userId, deletedAt: null },
      _sum: { viewCount: true },
    });
    return _sum.viewCount ?? 0;
  },
};
