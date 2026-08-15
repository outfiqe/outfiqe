import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { EXPLORE_ROOM, SOCKET_EVENTS } from "./socket.keys.js";
import { getIO } from "./socket.server.js";
import type { LookCreatedPayload } from "./socket.types.js";

export const registerSocketListeners = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_CREATED,
    groupName: "socket-broadcast",
    handler: async (event): Promise<void> => {
      const lookCreatedPayload: LookCreatedPayload = {
        lookId: event.lookId,
        creatorId: event.creatorId,
        createdAt: event.createdAt,
      };

      try {
        getIO().to(EXPLORE_ROOM).emit(SOCKET_EVENTS.LOOK_CREATED, lookCreatedPayload);
      } catch (error) {
        logger.error(`Failed to broadcast ${SOCKET_EVENTS.LOOK_CREATED}: ${describeError(error)}`);
      }
    },
  });
};
