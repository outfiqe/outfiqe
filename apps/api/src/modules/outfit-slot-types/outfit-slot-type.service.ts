import { prisma } from "#db/prisma.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import type { DbClient } from "#types/db.types.js";

import { outfitSlotTypeRepository } from "./outfit-slot-type.repository.js";
import type {
  CreateOutfitSlotTypeBody,
  UpdateOutfitSlotTypeBody,
} from "./outfit-slot-type.schemas.js";
import type { OutfitSlotTypeChange, OutfitSlotTypeView } from "./outfit-slot-type.types.js";
import { toOutfitSlotTypeView } from "./outfit-slot-type.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const NO_LINKED_PRODUCT_TYPES = 0;

const requireSlotType = async (client: DbClient, id: string): Promise<OutfitSlotTypeView> => {
  const row = await outfitSlotTypeRepository.findById(client, id);
  if (!row) {
    throw new AppError("SLOT_TYPE_NOT_FOUND", "Slot type not found.", NOT_FOUND_STATUS);
  }
  return toOutfitSlotTypeView(row);
};

const assertProductTypesExist = async (client: DbClient, productTypeIds: string[]) => {
  const foundCount = await outfitSlotTypeRepository.countProductTypes(client, productTypeIds);
  if (foundCount !== productTypeIds.length) {
    throw new AppError(
      "UNKNOWN_PRODUCT_TYPES",
      "One or more of the chosen garment types no longer exist.",
      UNPROCESSABLE_STATUS,
    );
  }
};

const assertBlockedSlotTypesExist = async (
  client: DbClient,
  blocksSlotTypeIds: string[],
  slotTypeId: string | null,
) => {
  if (slotTypeId && blocksSlotTypeIds.includes(slotTypeId)) {
    throw new AppError(
      "SLOT_TYPE_BLOCKS_ITSELF",
      "A slot type can't block itself.",
      UNPROCESSABLE_STATUS,
    );
  }
  const foundCount = await outfitSlotTypeRepository.countSlotTypes(client, blocksSlotTypeIds);
  if (foundCount !== blocksSlotTypeIds.length) {
    throw new AppError(
      "UNKNOWN_SLOT_TYPES",
      "One or more of the slot types to block no longer exist.",
      UNPROCESSABLE_STATUS,
    );
  }
};

const assertSlotCanBeFilled = (acceptsAnyProductType: boolean, productTypeCount: number) => {
  if (!acceptsAnyProductType && productTypeCount === NO_LINKED_PRODUCT_TYPES) {
    throw new AppError(
      "SLOT_TYPE_NEEDS_PRODUCT_TYPES",
      "Pick at least one garment type, or let this slot take any garment type.",
      UNPROCESSABLE_STATUS,
    );
  }
};

const withSlotKeyConflictHandling = async <Result>(run: () => Promise<Result>): Promise<Result> => {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "SLOT_KEY_TAKEN",
        "A slot type with this key already exists.",
        CONFLICT_STATUS,
      );
    }
    throw error;
  }
};

export const outfitSlotTypeService = {
  async listForAdmin(): Promise<OutfitSlotTypeView[]> {
    const rows = await outfitSlotTypeRepository.listAll();
    return rows.map(toOutfitSlotTypeView);
  },

  async create(input: CreateOutfitSlotTypeBody): Promise<OutfitSlotTypeView> {
    return withSlotKeyConflictHandling(() =>
      prisma.$transaction(async (tx) => {
        await assertProductTypesExist(tx, input.productTypeIds);
        await assertBlockedSlotTypesExist(tx, input.blocksSlotTypeIds, null);
        const sortOrder = await outfitSlotTypeRepository.nextSortOrder(tx);
        const row = await outfitSlotTypeRepository.create(tx, input, sortOrder);
        return toOutfitSlotTypeView(row);
      }),
    );
  },

  async update(id: string, input: UpdateOutfitSlotTypeBody): Promise<OutfitSlotTypeChange> {
    return prisma.$transaction(async (tx) => {
      const before = await requireSlotType(tx, id);
      const { productTypeIds, blocksSlotTypeIds, acceptsAnyProductType } = input;

      if (productTypeIds) await assertProductTypesExist(tx, productTypeIds);
      if (blocksSlotTypeIds) await assertBlockedSlotTypesExist(tx, blocksSlotTypeIds, id);
      assertSlotCanBeFilled(
        acceptsAnyProductType ?? before.acceptsAnyProductType,
        productTypeIds?.length ?? before.productTypes.length,
      );

      const row = await outfitSlotTypeRepository.update(tx, id, input);
      return { before, after: toOutfitSlotTypeView(row) };
    });
  },

  async reorder(orderedIds: string[]): Promise<void> {
    const existingIds = new Set(await outfitSlotTypeRepository.listIds());
    const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
    const listsEverySlotTypeOnce =
      !hasDuplicates &&
      orderedIds.length === existingIds.size &&
      orderedIds.every((id) => existingIds.has(id));

    if (!listsEverySlotTypeOnce) {
      throw new AppError(
        "INVALID_ORDER",
        "The reorder request must list every slot type exactly once.",
        UNPROCESSABLE_STATUS,
      );
    }

    await outfitSlotTypeRepository.reorder(orderedIds);
  },
};
