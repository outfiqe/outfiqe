import type { Prisma } from "#generated/prisma/client.js";
import { OutfitEventType } from "#generated/prisma/enums.js";
import { buildChatService } from "#modules/chat/build-chat.service.js";
import { CHAT_SYSTEM_EVENT } from "#modules/chat/chat.constants.js";
import type { ChatSystemEvent } from "#modules/chat/message.schemas.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";

import { outfitRepository } from "./outfit.repository.js";
import type { OutfitActor } from "./outfit.types.js";

export type OutfitChange = {
  outfitId: string;
  version: number;
  eventType: OutfitEventType;
  actor: OutfitActor;
  details: Prisma.InputJsonObject;
  buildChatId: string | null;
};

const ITEM_CHAT_EVENT_TYPES = {
  [OutfitEventType.ITEM_ADDED]: CHAT_SYSTEM_EVENT.OUTFIT_ITEM_ADDED,
  [OutfitEventType.ITEM_SWAPPED]: CHAT_SYSTEM_EVENT.OUTFIT_ITEM_SWAPPED,
  [OutfitEventType.ITEM_REMOVED]: CHAT_SYSTEM_EVENT.OUTFIT_ITEM_REMOVED,
} as const;

const isItemEventType = (
  eventType: OutfitEventType,
): eventType is keyof typeof ITEM_CHAT_EVENT_TYPES =>
  Object.hasOwn(ITEM_CHAT_EVENT_TYPES, eventType);

const describeForBuildChat = async (
  tx: Prisma.TransactionClient,
  { eventType, details }: Pick<OutfitChange, "eventType" | "details">,
): Promise<ChatSystemEvent | null> => {
  if (isItemEventType(eventType)) {
    const { productId } = details;
    const productName =
      typeof productId === "string" ? await outfitRepository.findProductName(tx, productId) : null;
    return productName ? { type: ITEM_CHAT_EVENT_TYPES[eventType], productName } : null;
  }
  if (eventType === OutfitEventType.MEMBER_HAPPY && details.isEveryoneHappy === true) {
    return { type: CHAT_SYSTEM_EVENT.OUTFIT_EVERYONE_HAPPY };
  }
  if (eventType === OutfitEventType.LOCKED) return { type: CHAT_SYSTEM_EVENT.OUTFIT_LOCKED };
  if (eventType === OutfitEventType.UNLOCKED) return { type: CHAT_SYSTEM_EVENT.OUTFIT_UNLOCKED };
  return null;
};

export const recordOutfitChange = async (
  tx: Prisma.TransactionClient,
  change: OutfitChange,
): Promise<void> => {
  const { outfitId, version, eventType, actor, details, buildChatId } = change;
  await outfitRepository.insertEvent(tx, {
    outfitId,
    version,
    actorId: actor.id,
    type: eventType,
    payload: details,
  });

  const announcement = {
    outfitId,
    version,
    eventType,
    actorId: actor.id,
    details,
    occurredAt: new Date().toISOString(),
  };
  await enqueueOutboxEvent(tx, {
    topic: OUTBOX_TOPIC.OUTFIT_CHANGED,
    aggregateId: outfitId,
    payload: announcement,
  });
  await enqueueOutboxEvent(tx, {
    topic: OUTBOX_TOPIC.OUTFIT_ACTIVITY,
    aggregateId: outfitId,
    payload: announcement,
  });

  if (!buildChatId) return;
  const buildChatEvent = await describeForBuildChat(tx, change);
  if (buildChatEvent) {
    await buildChatService.announceBuildChange(tx, buildChatId, actor, buildChatEvent);
  }
};
