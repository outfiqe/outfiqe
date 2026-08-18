import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";

export const EXPLORE_ROOM = "explore";

export const userRoom = (userId: string): string => `user:${userId}`;

export const leaderboardRoom = (category: LeaderboardCategory): string => `leaderboard:${category}`;

export const SOCKET_EVENTS = {
  LOOK_CREATED: "look:created",
  FEED_SYNC_REQUEST: "feed:sync:request",
  FEED_SYNC_RESULT: "feed:sync:result",
  LEADERBOARD_UPDATED: "leaderboard:updated",
  LEADERBOARD_SUBSCRIBE: "leaderboard:subscribe",
  LEADERBOARD_UNSUBSCRIBE: "leaderboard:unsubscribe",
} as const;

export const SOCKET_RATE_LIMIT = {
  NAMESPACE: "socket-connect",
  WINDOW_MS: 60_000,
  MAX_CONNECTIONS: 30,
} as const;
