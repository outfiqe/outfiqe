import { parseISO } from "date-fns/parseISO";
import { secondsToMilliseconds } from "date-fns/secondsToMilliseconds";

import { prisma } from "#db/prisma.js";
import {
  NotificationEntityType,
  NotificationType,
  OutfitEventType,
  OutfitMemberRole,
  OutfitVisibility,
} from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { notificationService } from "#modules/notifications/notification.service.js";
import type { NotificationActorSnapshot } from "#modules/notifications/notification.types.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { registerOutboxHandler } from "#outbox/outbox.handlers.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";

import {
  type OutfitAnnouncement,
  parseOutfitAnnouncement,
  readDetailString,
  readDetailStrings,
} from "./outfit.announcement.js";
import { outfitRepository } from "./outfit.repository.js";

export const OUTFIT_ACTIVITY_WINDOW_MS = secondsToMilliseconds(30);

const BOARD_EDIT_EVENT_TYPES: readonly OutfitEventType[] = [
  OutfitEventType.ITEM_ADDED,
  OutfitEventType.ITEM_SWAPPED,
  OutfitEventType.ITEM_REMOVED,
  OutfitEventType.EXTRAS_REORDERED,
];

type NotificationContext = {
  announcement: OutfitAnnouncement;
  outboxEventId: string;
  actor: NotificationActorSnapshot;
  outfitTitle: string | null;
  members: { userId: string; role: OutfitMemberRole }[];
};

export const activityWindowGroupKey = (outfitId: string, occurredAt: string): string => {
  const windowIndex = Math.floor(parseISO(occurredAt).getTime() / OUTFIT_ACTIVITY_WINDOW_MS);
  return `outfit-activity:${outfitId}:${windowIndex}`;
};

const notifyPeople = async (
  { announcement, outboxEventId, actor, outfitTitle }: NotificationContext,
  type: NotificationType,
  recipientIds: string[],
): Promise<void> => {
  const recipientsOtherThanActor = recipientIds.filter((recipientId) => recipientId !== actor.id);
  await notificationService.notifyManyIndividual(
    recipientsOtherThanActor.map((recipientId) => ({
      recipientId,
      actorId: actor.id,
      type,
      entityType: NotificationEntityType.OUTFIT,
      entityId: announcement.outfitId,
      metadata: { actor, outfitTitle },
      sourceEventId: outboxEventId,
    })),
  );
};

const notifyBoardActivity = async ({
  announcement,
  actor,
  outfitTitle,
  members,
}: NotificationContext): Promise<void> => {
  const { outfitId, occurredAt } = announcement;
  const groupKey = activityWindowGroupKey(outfitId, occurredAt);
  for (const { userId } of members) {
    await notificationService.notifyGroup({
      recipientId: userId,
      actorId: actor.id,
      actor,
      type: NotificationType.OUTFIT_BOARD_ACTIVITY,
      entityType: NotificationEntityType.OUTFIT,
      entityId: outfitId,
      groupKey,
      metadata: { outfitTitle },
    });
  }
};

const notifyForChange = async (context: NotificationContext): Promise<void> => {
  const { announcement, members } = context;
  const memberIds = members.map(({ userId }) => userId);
  const ownerIds = members
    .filter(({ role }) => role === OutfitMemberRole.OWNER)
    .map(({ userId }) => userId);

  if (BOARD_EDIT_EVENT_TYPES.includes(announcement.eventType)) {
    return notifyBoardActivity(context);
  }

  switch (announcement.eventType) {
    case OutfitEventType.MEMBER_HAPPY:
      if (announcement.details.isEveryoneHappy === true) {
        await notifyPeople(context, NotificationType.OUTFIT_READY_TO_LOCK, ownerIds);
      }
      return;
    case OutfitEventType.LOCKED:
      return notifyPeople(context, NotificationType.OUTFIT_LOCKED, memberIds);
    case OutfitEventType.MEMBER_ADDED:
      return notifyPeople(
        context,
        NotificationType.OUTFIT_INVITED,
        readDetailStrings(announcement, "userIds"),
      );
    case OutfitEventType.SHARED:
      return notifyPeople(
        context,
        NotificationType.OUTFIT_SHARED,
        readDetailStrings(announcement, "sharedWithUserIds"),
      );
    case OutfitEventType.VISIBILITY_CHANGED:
      if (readDetailString(announcement, "visibility") === OutfitVisibility.PUBLIC) {
        await notifyPeople(context, NotificationType.OUTFIT_MADE_PUBLIC, memberIds);
      }
      return;
    default:
      return;
  }
};

export const notifyOutfitActivity = async ({
  outboxEventId,
  payload,
}: OutboxJobData): Promise<void> => {
  const announcement = parseOutfitAnnouncement(payload);
  if (!announcement) {
    logger.error(`Outbox event ${outboxEventId} for ${OUTBOX_TOPIC.OUTFIT_ACTIVITY} is unreadable`);
    return;
  }
  if (!announcement.actorId) return;
  if (!(await featureFlagsService.isRolledOutToAnyone("outfit_builder"))) return;

  const [actor, outfit] = await Promise.all([
    notificationService.describeActor(announcement.actorId),
    outfitRepository.findAccess(prisma, announcement.outfitId),
  ]);
  if (!actor || !outfit) return;

  const members = await outfitRepository.listMemberRoles(prisma, announcement.outfitId);
  await notifyForChange({
    announcement,
    outboxEventId,
    actor,
    outfitTitle: outfit.title,
    members,
  });
};

export const registerOutfitNotificationHandlers = (): void => {
  registerOutboxHandler(OUTBOX_TOPIC.OUTFIT_ACTIVITY, notifyOutfitActivity);
};
