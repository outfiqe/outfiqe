import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { AccountStatus, ProductStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { OutfitBoardProductRow, OutfitBoardRow } from "../outfit.query-helpers.js";
import { boardInclude, boardProductSelect } from "../outfit.query-helpers.js";

export type OutfitRuleItemRow = {
  id: string;
  outfitSlotId: string;
  slotKey: string;
  position: number;
  productId: string;
  addedById: string | null;
};

const TEMPORARY_POSITION_OFFSET_STEP = 1;

export const outfitItemRepository = {
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

  async findBoardProducts(productIds: string[]): Promise<OutfitBoardProductRow[]> {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: boardProductSelect(),
    });
  },

  async findProductName(client: DbClient, productId: string): Promise<string | null> {
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    return product?.name ?? null;
  },
};
