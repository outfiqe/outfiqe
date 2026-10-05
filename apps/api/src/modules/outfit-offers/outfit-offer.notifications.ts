import { z } from "zod";

import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { notificationService } from "#modules/notifications/notification.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { registerOutboxHandler } from "#outbox/outbox.handlers.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";

import { outfitOfferRepository } from "./outfit-offer.repository.js";

const OFFER_NOTICE_TYPES = [
  NotificationType.OUTFIT_OFFER_RECEIVED,
  NotificationType.OUTFIT_OFFER_ACCEPTED,
  NotificationType.OUTFIT_OFFER_DECLINED,
  NotificationType.OUTFIT_OFFER_EXPIRED,
  NotificationType.OUTFIT_OFFER_RELEASED,
  NotificationType.OUTFIT_OFFER_REFUNDED,
] as const;

const offerNoticeSchema = z.object({
  offerId: z.uuid(),
  type: z.enum(OFFER_NOTICE_TYPES),
  recipientIds: z.array(z.uuid()),
  actorId: z.uuid().nullable(),
});

export type OfferNotice = z.infer<typeof offerNoticeSchema>;

export const queueOfferNotice = async (
  tx: Prisma.TransactionClient,
  notice: OfferNotice,
): Promise<void> => {
  await enqueueOutboxEvent(tx, {
    topic: OUTBOX_TOPIC.OUTFIT_OFFER_NOTICE,
    aggregateId: notice.offerId,
    payload: notice,
  });
};

export const sendOfferNotice = async ({ outboxEventId, payload }: OutboxJobData): Promise<void> => {
  const parsed = offerNoticeSchema.safeParse(payload);
  if (!parsed.success) {
    logger.error(`Outbox event ${outboxEventId} for an offer notice is unreadable`);
    return;
  }
  const { offerId, type, recipientIds, actorId } = parsed.data;

  const [offer, actor] = await Promise.all([
    outfitOfferRepository.findById(prisma, offerId),
    actorId ? notificationService.describeActor(actorId) : Promise.resolve(null),
  ]);
  if (!offer) return;

  await notificationService.notifyManyIndividual(
    recipientIds.map((recipientId) => ({
      recipientId,
      actorId,
      type,
      entityType: NotificationEntityType.OUTFIT_OFFER,
      entityId: offerId,
      metadata: {
        ...(actor ? { actor } : {}),
        outfitTitle: offer.outfit.title,
        brandName: offer.brand.name,
        offerAmount: offer.amount,
      },
      sourceEventId: outboxEventId,
    })),
  );
};

export const registerOutfitOfferNotificationHandlers = (): void => {
  registerOutboxHandler(OUTBOX_TOPIC.OUTFIT_OFFER_NOTICE, sendOfferNotice);
};
