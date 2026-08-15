import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";

import { feedSyncRequestSchema } from "./creatorLook.schemas.js";
import { creatorLookService } from "./creatorLook.service.js";

export const registerCreatorLookSocketHandlers = (): void => {
  getIO().on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.FEED_SYNC_REQUEST, async (payload) => {
      const parsed = feedSyncRequestSchema.safeParse(payload);
      if (!parsed.success) return;

      try {
        const count = await creatorLookService.countNewSince(socket.data.auth?.userId, {
          tab: parsed.data.tab,
          since: new Date(parsed.data.since),
        });
        socket.emit(SOCKET_EVENTS.FEED_SYNC_RESULT, { count });
      } catch (error) {
        logger.error(`Failed to compute feed sync count: ${describeError(error)}`);
      }
    });
  });
};
