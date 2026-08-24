import type { DefaultEventsMap, Server, Socket } from "socket.io";

import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type {
  MessageBroadcastPayload,
  NotificationBroadcastPayload,
} from "#events/event-bus.types.js";
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
  sponsorBrandName: string | null;
};

export type LevelUpPayload = {
  previousLevel: { level: number; name: string };
  currentLevel: { level: number; name: string; icon: string | null };
};

export type NotificationReadPayload = { id: string };
export type NotificationReadAllPayload = { readAt: string };

export type ChatSettingsUpdatedPayload = { isChatEnabled: boolean };
export type ChatBlockListUpdatedPayload = { updatedAt: string };

export type CommentSubscriptionPayload = {
  lookId: string;
};

export type CommentCreatedPayload = {
  lookId: string;
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatarUrl: string | null;
  body: string;
  createdAt: string;
  replyCount: number;
};

export type CommentReplyCreatedPayload = {
  lookId: string;
  id: string;
  parentCommentId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatarUrl: string | null;
  body: string;
  createdAt: string;
};

export type ConversationSubscriptionPayload = {
  conversationId: string;
};

export type PresenceChangedPayload = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

// Key literals must match SOCKET_EVENTS in socket.keys.ts.
export type ServerToClientEvents = {
  "look:created": (payload: LookCreatedPayload) => void;
  "feed:sync:result": (payload: FeedSyncResultPayload) => void;
  "leaderboard:updated": (payload: LeaderboardUpdatedPayload) => void;
  "creator-leaderboard:updated": (payload: CreatorLeaderboardUpdatedPayload) => void;
  "achievement:unlocked": (payload: AchievementUnlockedPayload) => void;
  "level:up": (payload: LevelUpPayload) => void;
  "notification:created": (payload: NotificationBroadcastPayload) => void;
  "notification:updated": (payload: NotificationBroadcastPayload) => void;
  "notification:read": (payload: NotificationReadPayload) => void;
  "notification:read-all": (payload: NotificationReadAllPayload) => void;
  "comment:created": (payload: CommentCreatedPayload) => void;
  "comment:reply:created": (payload: CommentReplyCreatedPayload) => void;
  "chat:settings:updated": (payload: ChatSettingsUpdatedPayload) => void;
  "chat:block-list:updated": (payload: ChatBlockListUpdatedPayload) => void;
  "message:created": (payload: MessageBroadcastPayload) => void;
  "conversation:updated": (payload: MessageBroadcastPayload) => void;
  "presence:changed": (payload: PresenceChangedPayload) => void;
};

export type ClientToServerEvents = {
  "feed:sync:request": (payload: FeedSyncRequestPayload) => void;
  "leaderboard:subscribe": (payload: LeaderboardSubscriptionPayload) => void;
  "leaderboard:unsubscribe": (payload: LeaderboardSubscriptionPayload) => void;
  "creator-leaderboard:subscribe": (payload: CreatorLeaderboardSubscriptionPayload) => void;
  "creator-leaderboard:unsubscribe": (payload: CreatorLeaderboardSubscriptionPayload) => void;
  "comments:subscribe": (payload: CommentSubscriptionPayload) => void;
  "comments:unsubscribe": (payload: CommentSubscriptionPayload) => void;
  "conversation:subscribe": (payload: ConversationSubscriptionPayload) => void;
  "conversation:unsubscribe": (payload: ConversationSubscriptionPayload) => void;
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
