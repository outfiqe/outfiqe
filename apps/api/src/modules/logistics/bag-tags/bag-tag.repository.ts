import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

const batchSummaryInclude = {
  hub: { select: { name: true } },
  _count: { select: { tags: { where: { fulfilmentGroupId: { not: null } } } } },
} satisfies Prisma.BagTagBatchInclude;

export type BagTagBatchSummaryRecord = Prisma.BagTagBatchGetPayload<{
  include: typeof batchSummaryInclude;
}>;

export const logisticsBagTagRepository = {
  async createBagTagBatch(
    client: DbClient,
    batch: { hubId: string; tagCount: number; createdById: string },
  ) {
    return client.bagTagBatch.create({ data: batch, select: { id: true } });
  },

  async insertBagTags(client: DbClient, batchId: string, codes: string[]): Promise<number> {
    const { count } = await client.bagTag.createMany({
      data: codes.map((code) => ({ batchId, code })),
      skipDuplicates: true,
    });
    return count;
  },

  async listBagTagBatches(params: {
    hubId?: string;
    cursor?: string;
    limit: number;
  }): Promise<BagTagBatchSummaryRecord[]> {
    return prisma.bagTagBatch.findMany({
      where: params.hubId ? { hubId: params.hubId } : {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: batchSummaryInclude,
    });
  },

  async findBagTagBatchWithTags(batchId: string) {
    return prisma.bagTagBatch.findUnique({
      where: { id: batchId },
      include: {
        ...batchSummaryInclude,
        tags: { orderBy: { code: "asc" }, select: { code: true, fulfilmentGroupId: true } },
      },
    });
  },

  async findBagTagByCode(client: DbClient, code: string) {
    return client.bagTag.findUnique({
      where: { code },
      select: { id: true, fulfilmentGroupId: true, batch: { select: { hubId: true } } },
    });
  },

  async attachBagTag(
    client: DbClient,
    attachment: { bagTagId: string; fulfilmentGroupId: string; riderId: string; attachedAt: Date },
  ): Promise<boolean> {
    const { count } = await client.bagTag.updateMany({
      where: { id: attachment.bagTagId, fulfilmentGroupId: null },
      data: {
        fulfilmentGroupId: attachment.fulfilmentGroupId,
        attachedByRiderId: attachment.riderId,
        attachedAt: attachment.attachedAt,
      },
    });
    return count > 0;
  },
};
