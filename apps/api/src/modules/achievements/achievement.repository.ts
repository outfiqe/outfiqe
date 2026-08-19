import { prisma } from "#db/prisma.js";
import {
  AchievementRequirementType,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";

export const achievementRepository = {
  async findEligibleAchievements(userId: string) {
    return prisma.achievement.findMany({
      where: {
        isActive: true,
        requirementType: { not: AchievementRequirementType.ADMIN_AWARD },
        badge: { isActive: true, userBadges: { none: { userId } } },
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

  async createUserBadge(userId: string, badgeId: string): Promise<void> {
    await prisma.userBadge.create({ data: { userId, badgeId } });
  },
};
