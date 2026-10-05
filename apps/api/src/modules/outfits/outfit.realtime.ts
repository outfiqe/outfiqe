import { z } from "zod";

import { OutfitEventType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { registerOutboxHandler } from "#outbox/outbox.handlers.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";
import { outfitRoom, SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";

import { resolveLiveBoardRole } from "./outfit.access.js";
import { parseOutfitAnnouncement, readDetailString } from "./outfit.announcement.js";

const MEMBER_EXIT_EVENT_TYPES: readonly OutfitEventType[] = [
  OutfitEventType.MEMBER_REMOVED,
  OutfitEventType.MEMBER_LEFT,
];

const removeFromLiveBoardIfNoLongerAllowed = async (
  outfitId: string,
  userId: string,
): Promise<void> => {
  if (await resolveLiveBoardRole(outfitId, userId)) return;
  getIO().in(userRoom(userId)).socketsLeave(outfitRoom(outfitId));
  getIO().to(userRoom(userId)).emit(SOCKET_EVENTS.OUTFIT_REMOVED, { outfitId });
};

export const broadcastOutfitChange = async ({ outboxEventId, payload }: OutboxJobData) => {
  const announcement = parseOutfitAnnouncement(payload);
  if (!announcement) {
    logger.error(`Outbox event ${outboxEventId} for ${OUTBOX_TOPIC.OUTFIT_CHANGED} is unreadable`);
    return;
  }
  if (!(await featureFlagsService.isRolledOutToAnyone("outfit_builder"))) return;

  const { outfitId, version, eventType, actorId } = announcement;
  getIO()
    .to(outfitRoom(outfitId))
    .emit(SOCKET_EVENTS.OUTFIT_UPDATED, { outfitId, version, eventType, actorId });

  const departedUserId = MEMBER_EXIT_EVENT_TYPES.includes(eventType)
    ? readDetailString(announcement, "userId")
    : null;
  if (departedUserId) await removeFromLiveBoardIfNoLongerAllowed(outfitId, departedUserId);
};

const availabilityChangedPayloadSchema = z.object({ outfitId: z.string() });

export const broadcastAvailabilityChange = async ({ outboxEventId, payload }: OutboxJobData) => {
  const parsedPayload = availabilityChangedPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    logger.error(
      `Outbox event ${outboxEventId} for ${OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED} is unreadable`,
    );
    return;
  }
  const { outfitId } = parsedPayload.data;
  getIO().to(outfitRoom(outfitId)).emit(SOCKET_EVENTS.OUTFIT_AVAILABILITY_CHANGED, { outfitId });
};

export const registerOutfitRealtimeHandlers = (): void => {
  registerOutboxHandler(OUTBOX_TOPIC.OUTFIT_CHANGED, broadcastOutfitChange);
  registerOutboxHandler(OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED, broadcastAvailabilityChange);
};
