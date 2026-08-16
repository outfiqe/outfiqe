import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

import type { OrderFeeSettingsRecord, OrderFeeValues } from "./orderFeeSettings.types.js";

export const orderFeeSettingsRepository = {
  async find(): Promise<OrderFeeSettingsRecord | null> {
    return prisma.orderFeeSettings.findFirst();
  },

  async update(
    client: DbClient,
    id: string,
    values: Partial<OrderFeeValues>,
  ): Promise<OrderFeeSettingsRecord> {
    return client.orderFeeSettings.update({ where: { id }, data: values });
  },

  async recordHistory(
    client: DbClient,
    input: {
      settingsId: string;
      changedById: string;
      oldValues: OrderFeeValues;
      newValues: OrderFeeValues;
    },
  ): Promise<void> {
    await client.orderFeeSettingsHistory.create({
      data: {
        settingsId: input.settingsId,
        changedById: input.changedById,
        oldValues: input.oldValues as Prisma.InputJsonValue,
        newValues: input.newValues as Prisma.InputJsonValue,
      },
    });
  },

  async listHistory(params: { cursor?: string; limit: number }) {
    return prisma.orderFeeSettingsHistory.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { changedBy: { select: { name: true } } },
    });
  },
};
