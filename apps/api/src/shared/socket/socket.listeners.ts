import { DomainEvents, eventBus } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { EXPLORE_ROOM, SOCKET_EVENTS } from "./socket.keys.js";
import { getIO } from "./socket.server.js";
import type { LookCreatedPayload } from "./socket.types.js";

type LookCreatedEvent = { lookId: string; creatorId: string; createdAt: Date };

export const registerSocketListeners = (): void => {
  eventBus.on(DomainEvents.LOOK_CREATED, (event: LookCreatedEvent) => {
    const lookCreatedPayload: LookCreatedPayload = {
      lookId: event.lookId,
      creatorId: event.creatorId,
      createdAt: event.createdAt.toISOString(),
    };

    try {
      getIO().to(EXPLORE_ROOM).emit(SOCKET_EVENTS.LOOK_CREATED, lookCreatedPayload);
    } catch (error) {
      logger.error(`Failed to broadcast ${SOCKET_EVENTS.LOOK_CREATED}: ${describeError(error)}`);
    }
  });
};
