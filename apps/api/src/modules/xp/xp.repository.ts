import { prisma } from "#db/prisma.js";
import { type XpActivityType, XpTransactionStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { ActivityXpConfigRecord, AwardXpInput, LevelRecord } from "./xp.types.js";

export const xpRepository = {
  async findActivityConfig(activityType: XpActivityType): Promise<ActivityXpConfigRecord | null> {
    return prisma.activityXpConfig.findUnique({ where: { activityType } });
  },

  async findActiveLevelsDesc(): Promise<LevelRecord[]> {
    return prisma.level.findMany({ where: { isActive: true }, orderBy: { requiredXp: "desc" } });
  },

  async countTransactionsForEntity(
    userId: string,
    activityType: XpActivityType,
    relatedEntityId: string,
  ): Promise<number> {
    return prisma.xpTransaction.count({
      where: { userId, activityType, relatedEntityId, status: XpTransactionStatus.APPLIED },
    });
  },

  async findLastAwardedAt(userId: string, activityType: XpActivityType): Promise<Date | null> {
    const lastTransaction = await prisma.xpTransaction.findFirst({
      where: { userId, activityType, status: XpTransactionStatus.APPLIED },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return lastTransaction?.createdAt ?? null;
  },

  async sumAmountSince(userId: string, activityType: XpActivityType, since: Date): Promise<number> {
    const { _sum } = await prisma.xpTransaction.aggregate({
      where: {
        userId,
        activityType,
        status: XpTransactionStatus.APPLIED,
        createdAt: { gte: since },
      },
      _sum: { amount: true },
    });
    return _sum.amount ?? 0;
  },

  async createTransaction(
    client: DbClient,
    input: AwardXpInput & { amount: number },
  ): Promise<void> {
    await client.xpTransaction.create({
      data: {
        userId: input.userId,
        activityType: input.activityType,
        amount: input.amount,
        relatedEntityId: input.relatedEntityId,
        source: input.source,
        metadata: input.metadata,
      },
    });
  },

  async incrementProgress(
    client: DbClient,
    userId: string,
    amount: number,
    fallbackLevelId: string,
  ): Promise<{ totalXp: number; currentLevelId: string }> {
    return client.userProgress.upsert({
      where: { userId },
      create: { userId, totalXp: amount, currentLevelId: fallbackLevelId },
      update: { totalXp: { increment: amount } },
      select: { totalXp: true, currentLevelId: true },
    });
  },

  async setCurrentLevel(client: DbClient, userId: string, levelId: string): Promise<void> {
    await client.userProgress.update({ where: { userId }, data: { currentLevelId: levelId } });
  },

  async findProgressForUser(
    userId: string,
  ): Promise<{ totalXp: number; level: LevelRecord } | null> {
    const progress = await prisma.userProgress.findUnique({
      where: { userId },
      include: { currentLevel: true },
    });
    if (!progress) return null;
    return { totalXp: progress.totalXp, level: progress.currentLevel };
  },

  async listTransactionsForUser(userId: string, params: { cursor?: string; limit: number }) {
    return prisma.xpTransaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
  },
};
