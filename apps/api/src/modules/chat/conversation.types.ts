import type { ConversationType } from "#generated/prisma/enums.js";

export type ConversationParticipantSummary = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type ConversationParticipantPresence = {
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type ConversationParticipantView = ConversationParticipantSummary &
  ConversationParticipantPresence;

export type ConversationPreview = {
  id: string;
  type: ConversationType;
  otherParticipant: ConversationParticipantView | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
};

export type ConversationsPage = {
  items: ConversationPreview[];
  nextCursor: string | null;
};
