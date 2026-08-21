import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

export const EXPLORE_ROOM = "explore";

export const userRoom = (userId: string): string => `user:${userId}`;

export const leaderboardRoom = (category: LeaderboardCategory): string => `leaderboard:${category}`;

export const creatorLeaderboardRoom = (category: CreatorLeaderboardCategory): string =>
  `leaderboard:creator:${category}`;

export const SOCKET_EVENTS = {
  LOOK_CREATED: "look:created",
  FEED_SYNC_REQUEST: "feed:sync:request",
  FEED_SYNC_RESULT: "feed:sync:result",
  LEADERBOARD_UPDATED: "leaderboard:updated",
  LEADERBOARD_SUBSCRIBE: "leaderboard:subscribe",
  LEADERBOARD_UNSUBSCRIBE: "leaderboard:unsubscribe",
  CREATOR_LEADERBOARD_UPDATED: "creator-leaderboard:updated",
  CREATOR_LEADERBOARD_SUBSCRIBE: "creator-leaderboard:subscribe",
  CREATOR_LEADERBOARD_UNSUBSCRIBE: "creator-leaderboard:unsubscribe",
  ACHIEVEMENT_UNLOCKED: "achievement:unlocked",
  LEVEL_UP: "level:up",
} as const;

export const SOCKET_RATE_LIMIT = {
  NAMESPACE: "socket-connect",
  WINDOW_MS: 60_000,
  MAX_CONNECTIONS: 30,
} as const;
