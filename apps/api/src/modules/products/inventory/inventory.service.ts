import { randomUUID } from "node:crypto";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { InventoryMovementKind, InventoryMovementSource } from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";

import { requireOwnedProduct } from "../product.guards.js";
import type { AdjustStockBody } from "../product.schemas.js";
import type {
  BrandProductSize,
  SizeStockDelta,
  StockLine,
  StockMovement,
} from "../product.types.js";
import { mergeStockLinesBySize } from "../product.utils.js";
import { productInventoryRepository } from "./inventory.repository.js";

const recordStockChanges = async (
  tx: Prisma.TransactionClient,
  movement: StockMovement,
  sizeDeltas: SizeStockDelta[],
): Promise<void> => {
  if (sizeDeltas.length === 0) return;

  await productInventoryRepository.recordInventoryMovements(
    tx,
    sizeDeltas.map(({ sizeId, delta }) => ({ ...movement, sizeId, delta })),
  );
  await enqueueOutboxEvent(tx, {
    topic: OUTBOX_TOPIC.STOCK_CHANGED,
    aggregateId: movement.sourceId,
    payload: { sizeIds: sizeDeltas.map(({ sizeId }) => sizeId) },
  });
};

export const recordNewSizeStock = (
  tx: Prisma.TransactionClient,
  productId: string,
  sizes: BrandProductSize[],
): Promise<void> =>
  recordStockChanges(
    tx,
    {
      kind: InventoryMovementKind.SIZE_CREATED,
      sourceType: InventoryMovementSource.PRODUCT_SIZE,
      sourceId: productId,
    },
    sizes.map(({ id, stock }) => ({ sizeId: id, delta: stock })),
  );

export const productInventoryService = {
  async decrementStockForItems(
    tx: Prisma.TransactionClient,
    lines: StockLine[],
    movement: StockMovement,
  ): Promise<string[]> {
    const insufficientSizeIds: string[] = [];
    const committedDeltas: SizeStockDelta[] = [];
    for (const { sizeId, qty } of mergeStockLinesBySize(lines)) {
      const isDecremented = await productInventoryRepository.decrementStock(tx, sizeId, qty);
      if (isDecremented) committedDeltas.push({ sizeId, delta: -qty });
      else insufficientSizeIds.push(sizeId);
    }
    await recordStockChanges(tx, movement, committedDeltas);
    return insufficientSizeIds;
  },

  async restoreStockForItems(
    tx: Prisma.TransactionClient,
    lines: StockLine[],
    movement: StockMovement,
  ): Promise<void> {
    const restoredDeltas: SizeStockDelta[] = [];
    for (const { sizeId, qty } of mergeStockLinesBySize(lines)) {
      await productInventoryRepository.restoreStock(tx, sizeId, qty);
      restoredDeltas.push({ sizeId, delta: qty });
    }
    await recordStockChanges(tx, movement, restoredDeltas);
  },

  async adjustStock(
    userId: string,
    productId: string,
    { adjustments }: AdjustStockBody,
  ): Promise<BrandProductSize[]> {
    const brandId = await requireBrandId(userId);
    await requireOwnedProduct(productId, brandId);

    const sizeIds = adjustments.map((adjustment) => adjustment.sizeId);
    const ownedSizeIds = new Set(
      await productInventoryRepository.findSizeIdsForProduct(productId, sizeIds),
    );
    const unknownSizeId = sizeIds.find((sizeId) => !ownedSizeIds.has(sizeId));
    if (unknownSizeId) {
      throw new AppError(
        "SIZE_NOT_FOUND",
        "One or more sizes weren't found on this product.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const sortedAdjustments = [...adjustments].sort((left, right) =>
      left.sizeId.localeCompare(right.sizeId),
    );

    await prisma.$transaction(async (tx) => {
      for (const { sizeId, delta } of sortedAdjustments) {
        if (delta > 0) {
          await productInventoryRepository.restoreStock(tx, sizeId, delta);
          continue;
        }

        const isDecremented = await productInventoryRepository.decrementStock(tx, sizeId, -delta);
        if (!isDecremented) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            "Can't reduce stock below what's available.",
            HTTP_STATUS.BAD_REQUEST,
            { sizeId },
          );
        }
      }

      await recordStockChanges(
        tx,
        {
          kind: InventoryMovementKind.BRAND_ADJUSTMENT,
          sourceType: InventoryMovementSource.BRAND_ADJUSTMENT,
          sourceId: randomUUID(),
        },
        sortedAdjustments,
      );
    });

    return productInventoryRepository.listSizesForProduct(productId);
  },
};
