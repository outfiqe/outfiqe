import type { DefaultEventsMap, Server, Socket } from "socket.io";

import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";
import type { AuthPrincipal } from "#types/token.types.js";

export interface SocketData {
  auth: AuthPrincipal | null;
}

export type LookCreatedPayload = {
  lookId: string;
  creatorId: string;
  createdAt: string;
};

export type FeedSyncRequestPayload = {
  tab: string;
  since: string;
};

export type FeedSyncResultPayload = {
  count: number;
};

export type LeaderboardEntry = {
  rank: number;
  brandId: string;
  brandName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  score: number;
  scoreLabel: string;
  movement: number | null;
};

export type LeaderboardUpdatedPayload = {
  category: LeaderboardCategory;
  week: string;
  entries: LeaderboardEntry[];
};

export type LeaderboardSubscriptionPayload = {
  category: LeaderboardCategory;
};

export type CreatorLeaderboardEntry = {
  rank: number;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  avatarUrl: string | null;
  score: number;
  scoreLabel: string;
  movement: number | null;
};

export type CreatorLeaderboardUpdatedPayload = {
  category: CreatorLeaderboardCategory;
  week: string;
  entries: CreatorLeaderboardEntry[];
};

export type CreatorLeaderboardSubscriptionPayload = {
  category: CreatorLeaderboardCategory;
};

export type AchievementUnlockedPayload = {
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  xpReward: number;
};

export type LevelUpPayload = {
  previousLevel: { level: number; name: string };
  currentLevel: { level: number; name: string; icon: string | null };
};

// Key literals must match SOCKET_EVENTS in socket.keys.ts.
export type ServerToClientEvents = {
  "look:created": (payload: LookCreatedPayload) => void;
  "feed:sync:result": (payload: FeedSyncResultPayload) => void;
  "leaderboard:updated": (payload: LeaderboardUpdatedPayload) => void;
  "creator-leaderboard:updated": (payload: CreatorLeaderboardUpdatedPayload) => void;
  "achievement:unlocked": (payload: AchievementUnlockedPayload) => void;
  "level:up": (payload: LevelUpPayload) => void;
};

export type ClientToServerEvents = {
  "feed:sync:request": (payload: FeedSyncRequestPayload) => void;
  "leaderboard:subscribe": (payload: LeaderboardSubscriptionPayload) => void;
  "leaderboard:unsubscribe": (payload: LeaderboardSubscriptionPayload) => void;
  "creator-leaderboard:subscribe": (payload: CreatorLeaderboardSubscriptionPayload) => void;
  "creator-leaderboard:unsubscribe": (payload: CreatorLeaderboardSubscriptionPayload) => void;
};

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;
