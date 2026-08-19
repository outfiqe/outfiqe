import {
  LEADERBOARD_CATEGORY,
  type LeaderboardCategory,
} from "#constants/leaderboard.constants.js";
import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { leaderboardRoom, SOCKET_EVENTS } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type {
  LeaderboardSubscriptionPayload,
  LeaderboardUpdatedPayload,
} from "#socket/socket.types.js";

import { leaderboardService } from "./leaderboard.service.js";

const LEADERBOARD_CATEGORIES: readonly LeaderboardCategory[] = Object.values(LEADERBOARD_CATEGORY);

const isLeaderboardCategory = (value: string): value is LeaderboardCategory =>
  LEADERBOARD_CATEGORIES.some((category) => category === value);

export const registerLeaderboardSocketHandlers = (): void => {
  getIO().on("connection", (socket) => {
    socket.on(
      SOCKET_EVENTS.LEADERBOARD_SUBSCRIBE,
      ({ category }: LeaderboardSubscriptionPayload) => {
        if (!isLeaderboardCategory(category)) return;
        void socket.join(leaderboardRoom(category));
      },
    );

    socket.on(
      SOCKET_EVENTS.LEADERBOARD_UNSUBSCRIBE,
      ({ category }: LeaderboardSubscriptionPayload) => {
        if (!isLeaderboardCategory(category)) return;
        void socket.leave(leaderboardRoom(category));
      },
    );
  });
};

export const registerLeaderboardEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LEADERBOARD_BRAND_UPDATED,
    groupName: "socket-broadcast",
    handler: async (event): Promise<void> => {
      try {
        const snapshot = await leaderboardService.getTop(event.category);
        const payload: LeaderboardUpdatedPayload = {
          category: snapshot.category,
          week: snapshot.week,
          entries: snapshot.entries,
        };
        getIO()
          .to(leaderboardRoom(event.category))
          .emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, payload);
      } catch (error) {
        logger.error(`Failed to broadcast leaderboard update: ${describeError(error)}`);
      }
    },
  });
};
