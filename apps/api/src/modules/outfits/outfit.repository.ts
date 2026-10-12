import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OutfitMemberRole } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { outfitItemRepository } from "./items/item.repository.js";
import { outfitMemberRepository } from "./members/member.repository.js";
import type { OutfitAccessRow, OutfitSlotCopy, OutfitSummaryRow } from "./outfit.query-helpers.js";
import { activeBuildStatuses, outfitAccessSelect, summaryInclude } from "./outfit.query-helpers.js";
import type { OutfitSnapshotItem } from "./outfit.types.js";
import { outfitShareRepository } from "./visibility/visibility.repository.js";

const NO_ROWS = 0;
const VERSION_STEP = 1;

export const outfitRepository = {
  async listActiveSlotTypesForCopy(client: DbClient) {
    return client.outfitSlotType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        productTypes: { select: { productTypeId: true } },
        blocks: { select: { blockedSlotType: { select: { key: true } } } },
      },
    });
  },

  async lockConversation(tx: Prisma.TransactionClient, conversationId: string): Promise<boolean> {
    const lockedRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM conversations WHERE id = ${conversationId}::uuid FOR UPDATE
    `;
    return lockedRows.length > NO_ROWS;
  },

  async isConversationParticipant(
    client: DbClient,
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await client.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { userId: true },
    });
    return participant !== null;
  },

  async countBuildsStartedIn(client: DbClient, conversationId: string): Promise<number> {
    return client.outfit.count({
      where: { sourceConversationId: conversationId, status: { in: activeBuildStatuses } },
    });
  },

  async create(
    tx: Prisma.TransactionClient,
    {
      title,
      ownerId,
      sourceConversationId,
      slots,
    }: {
      title: string | null;
      ownerId: string;
      sourceConversationId: string | null;
      slots: OutfitSlotCopy[];
    },
  ): Promise<{ id: string; version: number }> {
    return tx.outfit.create({
      data: {
        title,
        createdById: ownerId,
        sourceConversationId,
        members: { create: { userId: ownerId, role: OutfitMemberRole.OWNER } },
        slots: { create: slots },
      },
      select: { id: true, version: true },
    });
  },

  async findAccess(client: DbClient, outfitId: string): Promise<OutfitAccessRow | null> {
    return client.outfit.findUnique({ where: { id: outfitId }, select: outfitAccessSelect });
  },

  async bumpVersion(
    tx: Prisma.TransactionClient,
    outfitId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const { count } = await tx.outfit.updateMany({
      where: { id: outfitId, version: expectedVersion },
      data: { version: { increment: VERSION_STEP } },
    });
    return count > NO_ROWS;
  },

  async update(
    tx: Prisma.TransactionClient,
    outfitId: string,
    changes: Prisma.OutfitUncheckedUpdateInput,
  ): Promise<void> {
    await tx.outfit.update({ where: { id: outfitId }, data: changes });
  },

  async createSnapshot(
    tx: Prisma.TransactionClient,
    snapshot: {
      outfitId: string;
      version: number;
      items: OutfitSnapshotItem[];
      total: number;
      contributorIds: string[];
    },
  ): Promise<void> {
    await tx.outfitSnapshot.create({ data: snapshot });
  },

  async findLatestSnapshotVersion(client: DbClient, outfitId: string): Promise<number | null> {
    const snapshot = await client.outfitSnapshot.findFirst({
      where: { outfitId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return snapshot?.version ?? null;
  },

  async findSnapshot(client: DbClient, outfitId: string, version: number) {
    return client.outfitSnapshot.findUnique({
      where: { outfitId_version: { outfitId, version } },
    });
  },

  async insertEvent(
    tx: Prisma.TransactionClient,
    event: Prisma.OutfitEventUncheckedCreateInput,
  ): Promise<void> {
    await tx.outfitEvent.create({ data: event });
  },

  async listEventsSince(outfitId: string, sinceVersion: number, limit: number) {
    return prisma.outfitEvent.findMany({
      where: { outfitId, version: { gt: sinceVersion } },
      orderBy: { version: "asc" },
      take: limit,
    });
  },

  async listForMember(
    userId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<OutfitSummaryRow[]> {
    return prisma.outfit.findMany({
      where: { status: { in: activeBuildStatuses }, members: { some: { userId } } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: summaryInclude,
    });
  },

  ...outfitItemRepository,

  ...outfitMemberRepository,

  ...outfitShareRepository,
};
