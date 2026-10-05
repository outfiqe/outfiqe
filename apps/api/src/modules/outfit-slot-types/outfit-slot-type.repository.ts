import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

import type {
  CreateOutfitSlotTypeInput,
  UpdateOutfitSlotTypeInput,
} from "./outfit-slot-type.types.js";

const slotTypeReferenceSelect = { id: true, key: true, label: true } as const;

export const outfitSlotTypeInclude = {
  productTypes: { include: { productType: { select: { id: true, slug: true, label: true } } } },
  blocks: { include: { blockedSlotType: { select: slotTypeReferenceSelect } } },
  blockedBy: { include: { slotType: { select: slotTypeReferenceSelect } } },
} satisfies Prisma.OutfitSlotTypeInclude;

export type OutfitSlotTypeRow = Prisma.OutfitSlotTypeGetPayload<{
  include: typeof outfitSlotTypeInclude;
}>;

const toProductTypeLinks = (productTypeIds: string[]) =>
  productTypeIds.map((productTypeId) => ({ productTypeId }));

const toBlockLinks = (blocksSlotTypeIds: string[]) =>
  blocksSlotTypeIds.map((blockedSlotTypeId) => ({ blockedSlotTypeId }));

const slotTypeOrder = [{ sortOrder: "asc" }, { createdAt: "asc" }] as const;

const LAST_SORT_ORDER_WHEN_EMPTY = -1;
const NEXT_SORT_ORDER_STEP = 1;

export const outfitSlotTypeRepository = {
  async listAll(): Promise<OutfitSlotTypeRow[]> {
    return prisma.outfitSlotType.findMany({
      include: outfitSlotTypeInclude,
      orderBy: [...slotTypeOrder],
    });
  },

  async findById(client: DbClient, id: string): Promise<OutfitSlotTypeRow | null> {
    return client.outfitSlotType.findUnique({ where: { id }, include: outfitSlotTypeInclude });
  },

  async nextSortOrder(client: DbClient): Promise<number> {
    const { _max } = await client.outfitSlotType.aggregate({ _max: { sortOrder: true } });
    return (_max.sortOrder ?? LAST_SORT_ORDER_WHEN_EMPTY) + NEXT_SORT_ORDER_STEP;
  },

  async create(
    client: DbClient,
    { productTypeIds, blocksSlotTypeIds, ...fields }: CreateOutfitSlotTypeInput,
    sortOrder: number,
  ): Promise<OutfitSlotTypeRow> {
    return client.outfitSlotType.create({
      data: {
        ...fields,
        sortOrder,
        productTypes: { create: toProductTypeLinks(productTypeIds) },
        blocks: { create: toBlockLinks(blocksSlotTypeIds) },
      },
      include: outfitSlotTypeInclude,
    });
  },

  async update(
    client: DbClient,
    id: string,
    { productTypeIds, blocksSlotTypeIds, ...fields }: UpdateOutfitSlotTypeInput,
  ): Promise<OutfitSlotTypeRow> {
    return client.outfitSlotType.update({
      where: { id },
      data: {
        ...fields,
        ...(productTypeIds
          ? { productTypes: { deleteMany: {}, create: toProductTypeLinks(productTypeIds) } }
          : {}),
        ...(blocksSlotTypeIds
          ? { blocks: { deleteMany: {}, create: toBlockLinks(blocksSlotTypeIds) } }
          : {}),
      },
      include: outfitSlotTypeInclude,
    });
  },

  async countProductTypes(client: DbClient, ids: string[]): Promise<number> {
    return client.productType.count({ where: { id: { in: ids } } });
  },

  async countSlotTypes(client: DbClient, ids: string[]): Promise<number> {
    return client.outfitSlotType.count({ where: { id: { in: ids } } });
  },

  async listIds(): Promise<string[]> {
    const rows = await prisma.outfitSlotType.findMany({ select: { id: true } });
    return rows.map((row) => row.id);
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.outfitSlotType.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },
};
