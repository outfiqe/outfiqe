import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { creatorLeaderboardRoom, SOCKET_EVENTS } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type {
  CreatorLeaderboardSubscriptionPayload,
  CreatorLeaderboardUpdatedPayload,
} from "#socket/socket.types.js";

import { creatorLeaderboardService } from "./creatorLeaderboard.service.js";

const CREATOR_LEADERBOARD_CATEGORIES: readonly CreatorLeaderboardCategory[] = Object.values(
  CreatorLeaderboardCategory,
);

const isCreatorLeaderboardCategory = (value: string): value is CreatorLeaderboardCategory =>
  CREATOR_LEADERBOARD_CATEGORIES.some((category) => category === value);

export const registerCreatorLeaderboardSocketHandlers = (): void => {
  getIO().on("connection", (socket) => {
    socket.on(
      SOCKET_EVENTS.CREATOR_LEADERBOARD_SUBSCRIBE,
      ({ category }: CreatorLeaderboardSubscriptionPayload) => {
        if (!isCreatorLeaderboardCategory(category)) return;
        void socket.join(creatorLeaderboardRoom(category));
      },
    );

    socket.on(
      SOCKET_EVENTS.CREATOR_LEADERBOARD_UNSUBSCRIBE,
      ({ category }: CreatorLeaderboardSubscriptionPayload) => {
        if (!isCreatorLeaderboardCategory(category)) return;
        void socket.leave(creatorLeaderboardRoom(category));
      },
    );
  });
};

export const registerCreatorLeaderboardEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LEADERBOARD_CREATOR_UPDATED,
    groupName: "socket-broadcast",
    handler: async (event): Promise<void> => {
      try {
        const snapshot = await creatorLeaderboardService.getTop(event.category);
        const payload: CreatorLeaderboardUpdatedPayload = {
          category: snapshot.category,
          week: snapshot.week,
          entries: snapshot.entries,
        };
        getIO()
          .to(creatorLeaderboardRoom(event.category))
          .emit(SOCKET_EVENTS.CREATOR_LEADERBOARD_UPDATED, payload);
      } catch (error) {
        logger.error(`Failed to broadcast creator leaderboard update: ${describeError(error)}`);
      }
    },
  });
};
