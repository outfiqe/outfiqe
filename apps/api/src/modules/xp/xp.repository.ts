import { prisma } from "#db/prisma.js";
import { type XpActivityType, XpTransactionStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { CreateLevelBody, UpdateActivityXpConfigBody, UpdateLevelBody } from "./xp.schemas.js";
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

  async listAllLevels(): Promise<LevelRecord[]> {
    return prisma.level.findMany({ orderBy: { level: "asc" } });
  },

  async findLevelById(id: string): Promise<LevelRecord | null> {
    return prisma.level.findUnique({ where: { id } });
  },

  async createLevel(input: CreateLevelBody): Promise<LevelRecord> {
    return prisma.level.create({ data: input });
  },

  async updateLevel(id: string, input: UpdateLevelBody): Promise<LevelRecord> {
    return prisma.level.update({ where: { id }, data: input });
  },

  async listActivityConfigs(): Promise<ActivityXpConfigRecord[]> {
    return prisma.activityXpConfig.findMany({ orderBy: { activityType: "asc" } });
  },

  async updateActivityConfig(
    activityType: XpActivityType,
    input: UpdateActivityXpConfigBody,
  ): Promise<ActivityXpConfigRecord | null> {
    try {
      return await prisma.activityXpConfig.update({ where: { activityType }, data: input });
    } catch {
      return null;
    }
  },

  async sumTotalXpAwarded(): Promise<number> {
    const { _sum } = await prisma.xpTransaction.aggregate({
      where: { status: XpTransactionStatus.APPLIED },
      _sum: { amount: true },
    });
    return _sum.amount ?? 0;
  },

  async countUsersWithProgress(): Promise<number> {
    return prisma.userProgress.count();
  },
};
