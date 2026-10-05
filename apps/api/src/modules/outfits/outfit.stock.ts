import { z } from "zod";

import { prisma } from "#db/prisma.js";
import { NotificationEntityType, NotificationType, OutfitStatus } from "#generated/prisma/enums.js";
import { runWithDeadlockRetry } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { notificationService } from "#modules/notifications/notification.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { registerOutboxHandler } from "#outbox/outbox.handlers.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";

import { outfitRepository } from "./outfit.repository.js";
import { outfitStockRepository, type StockAlertItemRow } from "./outfit-stock.repository.js";

const NO_SIZES = 0;

const stockChangedPayloadSchema = z.object({ sizeIds: z.array(z.string()) });

const itemsSoldOutPayloadSchema = z.object({
  outfitId: z.string(),
  productIds: z.array(z.string()).min(1),
});

const groupProductIdsByOutfit = (items: StockAlertItemRow[]): Map<string, string[]> => {
  const productIdsByOutfit = new Map<string, string[]>();
  for (const { outfitId, productId } of items) {
    productIdsByOutfit.set(outfitId, [...(productIdsByOutfit.get(outfitId) ?? []), productId]);
  }
  return productIdsByOutfit;
};

export const flagSoldOutBoardItems = async ({
  outboxEventId,
  payload,
}: OutboxJobData): Promise<void> => {
  const parsedPayload = stockChangedPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    logger.error(`Outbox event ${outboxEventId} for ${OUTBOX_TOPIC.STOCK_CHANGED} is unreadable`);
    return;
  }
  const { sizeIds } = parsedPayload.data;
  if (sizeIds.length === NO_SIZES) return;
  if (!(await featureFlagsService.isRolledOutToAnyone("outfit_builder"))) return;

  await runWithDeadlockRetry(() =>
    prisma.$transaction(async (tx) => {
      const soldOutItems = await outfitStockRepository.claimNewlySoldOutItems(
        tx,
        sizeIds,
        new Date(),
      );
      const restockedItems = await outfitStockRepository.releaseRestockedItems(tx, sizeIds);

      for (const [outfitId, productIds] of groupProductIdsByOutfit(soldOutItems)) {
        await enqueueOutboxEvent(tx, {
          topic: OUTBOX_TOPIC.OUTFIT_ITEMS_SOLD_OUT,
          aggregateId: outfitId,
          payload: { outfitId, productIds },
        });
      }
      const changedOutfitIds = new Set(
        [...soldOutItems, ...restockedItems].map(({ outfitId }) => outfitId),
      );
      for (const outfitId of changedOutfitIds) {
        await enqueueOutboxEvent(tx, {
          topic: OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED,
          aggregateId: outfitId,
          payload: { outfitId },
        });
      }
    }),
  );
};

export const notifyItemsSoldOut = async ({
  outboxEventId,
  payload,
}: OutboxJobData): Promise<void> => {
  const parsedPayload = itemsSoldOutPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    logger.error(
      `Outbox event ${outboxEventId} for ${OUTBOX_TOPIC.OUTFIT_ITEMS_SOLD_OUT} is unreadable`,
    );
    return;
  }
  const { outfitId, productIds } = parsedPayload.data;
  if (!(await featureFlagsService.isRolledOutToAnyone("outfit_builder"))) return;

  const [outfit, members, productNameById] = await Promise.all([
    outfitRepository.findAccess(prisma, outfitId),
    outfitRepository.listMemberRoles(prisma, outfitId),
    outfitStockRepository.listProductNames(productIds),
  ]);
  if (!outfit || outfit.status !== OutfitStatus.DRAFT) return;

  const [firstProductId] = productIds;
  const firstProductName = firstProductId ? productNameById.get(firstProductId) : undefined;
  await notificationService.notifyManyIndividual(
    members.map(({ userId }) => ({
      recipientId: userId,
      actorId: null,
      type: NotificationType.OUTFIT_ITEMS_SOLD_OUT,
      entityType: NotificationEntityType.OUTFIT,
      entityId: outfitId,
      metadata: {
        outfitTitle: outfit.title,
        productName: firstProductName,
        soldOutItemCount: productIds.length,
      },
      sourceEventId: outboxEventId,
    })),
  );
};

export const registerOutfitStockHandlers = (): void => {
  registerOutboxHandler(OUTBOX_TOPIC.STOCK_CHANGED, flagSoldOutBoardItems);
  registerOutboxHandler(OUTBOX_TOPIC.OUTFIT_ITEMS_SOLD_OUT, notifyItemsSoldOut);
};
