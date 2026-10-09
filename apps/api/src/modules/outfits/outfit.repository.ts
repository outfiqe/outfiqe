import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  AccountStatus,
  OutfitMemberRole,
  OutfitStatus,
  OutfitVisibility,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { withActiveDiscount } from "#modules/products/product.query-helpers.js";
import type { DbClient } from "#types/db.types.js";

import { OFFER_STATUSES_AWAITING_CREATOR, OUTFIT_LIMITS } from "./outfit.constants.js";
import type { OutfitSnapshotItem } from "./outfit.types.js";

const NO_ROWS = 0;
const VERSION_STEP = 1;

export const outfitPersonSelect = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
} as const satisfies Prisma.UserSelect;

const outfitMemberUserSelect = {
  ...outfitPersonSelect,
  role: true,
  accountStatus: true,
  isCreator: true,
  creatorStatus: true,
} as const satisfies Prisma.UserSelect;

const LATEST_SNAPSHOT_ONLY = 1;

const boardProductSelect = () =>
  ({
    id: true,
    name: true,
    price: true,
    imageUrl: true,
    productTypeId: true,
    lowStock: true,
    brand: { select: { id: true, name: true } },
    sizes: { select: { label: true, stock: true }, orderBy: { sortOrder: "asc" } },
    ...withActiveDiscount(),
  }) satisfies Prisma.ProductSelect;

const boardInclude = () =>
  ({
    members: {
      include: { user: { select: outfitMemberUserSelect } },
      orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
    },
    slots: {
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: { select: boardProductSelect() },
            addedBy: { select: outfitPersonSelect },
          },
        },
      },
    },
    snapshots: {
      orderBy: { version: "desc" },
      take: LATEST_SNAPSHOT_ONLY,
      select: { version: true },
    },
  }) satisfies Prisma.OutfitInclude;

export type OutfitBoardRow = Prisma.OutfitGetPayload<{ include: ReturnType<typeof boardInclude> }>;

export type OutfitBoardProductRow = OutfitBoardRow["slots"][number]["items"][number]["product"];

const outfitAccessSelect = {
  id: true,
  title: true,
  status: true,
  visibility: true,
  version: true,
  sourceConversationId: true,
  conversationId: true,
  publishedVersion: true,
  maxItemsPerMember: true,
  removedAt: true,
} as const satisfies Prisma.OutfitSelect;

export type OutfitAccessRow = Prisma.OutfitGetPayload<{ select: typeof outfitAccessSelect }>;

const summaryInclude = {
  _count: { select: { members: true, items: true } },
  items: {
    orderBy: [{ slot: { sortOrder: "asc" } }, { position: "asc" }],
    take: OUTFIT_LIMITS.CARD_PREVIEW_PRODUCT_COUNT,
    select: { product: { select: { imageUrl: true } } },
  },
} as const satisfies Prisma.OutfitInclude;

export type OutfitSummaryRow = Prisma.OutfitGetPayload<{ include: typeof summaryInclude }>;

export type OutfitSlotCopy = {
  key: string;
  label: string;
  icon: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  productTypeIds: string[];
  blocksSlotKeys: string[];
  sortOrder: number;
};

export type OutfitRuleItemRow = {
  id: string;
  outfitSlotId: string;
  slotKey: string;
  position: number;
  productId: string;
  addedById: string | null;
};

const activeBuildStatuses = [OutfitStatus.DRAFT, OutfitStatus.LOCKED];

const TEMPORARY_POSITION_OFFSET_STEP = 1;

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

  async findMemberRole(
    client: DbClient,
    outfitId: string,
    userId: string,
  ): Promise<OutfitMemberRole | null> {
    const member = await client.outfitMember.findUnique({
      where: { outfitId_userId: { outfitId, userId } },
      select: { role: true },
    });
    return member?.role ?? null;
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

  async loadBoard(client: DbClient, outfitId: string): Promise<OutfitBoardRow | null> {
    return client.outfit.findUnique({ where: { id: outfitId }, include: boardInclude() });
  },

  async listRuleItems(
    tx: Prisma.TransactionClient,
    outfitId: string,
  ): Promise<OutfitRuleItemRow[]> {
    const items = await tx.outfitItem.findMany({
      where: { outfitId },
      select: {
        id: true,
        outfitSlotId: true,
        position: true,
        productId: true,
        addedById: true,
        slot: { select: { key: true } },
      },
    });
    return items.map(({ slot, ...item }) => ({ ...item, slotKey: slot.key }));
  },

  async listSlots(tx: Prisma.TransactionClient, outfitId: string) {
    return tx.outfitSlot.findMany({ where: { outfitId }, orderBy: { sortOrder: "asc" } });
  },

  async findPlaceableProduct(tx: Prisma.TransactionClient, productId: string) {
    return tx.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.APPROVED,
        deletedAt: null,
        brand: { accountStatus: AccountStatus.ACTIVE },
      },
      select: { id: true, productTypeId: true, sizes: { select: { stock: true } } },
    });
  },

  async createItem(
    tx: Prisma.TransactionClient,
    item: {
      outfitId: string;
      outfitSlotId: string;
      position: number;
      productId: string;
      addedById: string;
    },
  ): Promise<void> {
    await tx.outfitItem.create({ data: item });
  },

  async replaceItemProduct(
    tx: Prisma.TransactionClient,
    itemId: string,
    { productId, addedById }: { productId: string; addedById: string },
  ): Promise<void> {
    await tx.outfitItem.update({
      where: { id: itemId },
      data: { productId, addedById, addedAt: new Date() },
    });
  },

  async deleteItem(tx: Prisma.TransactionClient, itemId: string): Promise<void> {
    await tx.outfitItem.delete({ where: { id: itemId } });
  },

  async setItemPositions(
    tx: Prisma.TransactionClient,
    slot: { id: string; maxItems: number },
    orderedItemIds: string[],
  ): Promise<void> {
    const temporaryOffset = slot.maxItems + TEMPORARY_POSITION_OFFSET_STEP;
    for (const [position, itemId] of orderedItemIds.entries()) {
      await tx.outfitItem.update({
        where: { id: itemId },
        data: { position: position + temporaryOffset },
      });
    }
    for (const [position, itemId] of orderedItemIds.entries()) {
      await tx.outfitItem.update({ where: { id: itemId }, data: { position } });
    }
  },

  async clearHappiness(tx: Prisma.TransactionClient, outfitId: string): Promise<void> {
    await tx.outfitMember.updateMany({
      where: { outfitId, isHappy: true },
      data: { isHappy: false, happyAt: null },
    });
  },

  async setHappy(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
    isHappy: boolean,
  ): Promise<void> {
    await tx.outfitMember.update({
      where: { outfitId_userId: { outfitId, userId } },
      data: { isHappy, happyAt: isHappy ? new Date() : null },
    });
  },

  async listMembers(tx: Prisma.TransactionClient, outfitId: string) {
    return tx.outfitMember.findMany({
      where: { outfitId },
      select: { userId: true, role: true, isHappy: true },
    });
  },

  async listMemberRoles(client: DbClient, outfitId: string) {
    return client.outfitMember.findMany({
      where: { outfitId },
      select: { userId: true, role: true },
    });
  },

  async addEditors(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userIds: string[],
    invitedById: string,
  ): Promise<void> {
    await tx.outfitMember.createMany({
      data: userIds.map((userId) => ({
        outfitId,
        userId,
        invitedById,
        role: OutfitMemberRole.EDITOR,
      })),
    });
  },

  async removeMember(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<void> {
    await tx.outfitMember.delete({ where: { outfitId_userId: { outfitId, userId } } });
  },

  async removeContributorFromSnapshots(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE outfit_snapshots
      SET contributor_ids = array_remove(contributor_ids, ${userId}::uuid)
      WHERE outfit_id = ${outfitId}::uuid AND ${userId}::uuid = ANY(contributor_ids)
    `;
  },

  async hasOfferAwaitingCreator(
    tx: Prisma.TransactionClient,
    outfitId: string,
    creatorId: string,
  ): Promise<boolean> {
    const openOffer = await tx.outfitOffer.findFirst({
      where: { outfitId, creatorId, status: { in: [...OFFER_STATUSES_AWAITING_CREATOR] } },
      select: { id: true },
    });
    return openOffer !== null;
  },

  async setMemberRole(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
    role: OutfitMemberRole,
  ): Promise<void> {
    await tx.outfitMember.update({
      where: { outfitId_userId: { outfitId, userId } },
      data: { role },
    });
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

  async addShares(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userIds: string[],
    sharedById: string,
  ): Promise<void> {
    await tx.outfitShare.createMany({
      data: userIds.map((userId) => ({ outfitId, userId, sharedById })),
      skipDuplicates: true,
    });
  },

  async removeShare(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<number> {
    const { count } = await tx.outfitShare.deleteMany({ where: { outfitId, userId } });
    return count;
  },

  async hasShare(client: DbClient, outfitId: string, userId: string): Promise<boolean> {
    const share = await client.outfitShare.findUnique({
      where: { outfitId_userId: { outfitId, userId } },
      select: { userId: true },
    });
    return share !== null;
  },

  async findBoardProducts(productIds: string[]): Promise<OutfitBoardProductRow[]> {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: boardProductSelect(),
    });
  },

  async findPeople(client: DbClient, userIds: string[]) {
    return client.user.findMany({
      where: { id: { in: userIds }, accountStatus: AccountStatus.ACTIVE },
      select: outfitPersonSelect,
    });
  },

  async findProductName(client: DbClient, productId: string): Promise<string | null> {
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    return product?.name ?? null;
  },

  async findPersonReference(client: DbClient, userId: string) {
    return client.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  },

  async findInvitablePeople(client: DbClient, userIds: string[]) {
    return client.user.findMany({
      where: {
        id: { in: userIds },
        accountStatus: AccountStatus.ACTIVE,
        role: { in: [UserRole.CUSTOMER, UserRole.BRAND_OWNER] },
      },
      select: { id: true, name: true },
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

  async listSharedWith(
    userId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<OutfitSummaryRow[]> {
    return prisma.outfit.findMany({
      where: {
        status: { in: activeBuildStatuses },
        visibility: { in: [OutfitVisibility.SHARED, OutfitVisibility.PUBLIC] },
        publishedVersion: { not: null },
        shares: { some: { userId } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: summaryInclude,
    });
  },
};
