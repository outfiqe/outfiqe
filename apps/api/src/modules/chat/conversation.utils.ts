import type { ConversationType } from "#generated/prisma/enums.js";

import type {
  ConversationParticipantPresence,
  ConversationParticipantSummary,
  ConversationPreview,
} from "./conversation.types.js";

export const buildDirectKey = (userAId: string, userBId: string): string =>
  [userAId, userBId].sort().join(":");

export const participantUserSelect = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
} as const;

type ConversationWithParticipantsRow = {
  id: string;
  type: ConversationType;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  updatedAt: Date;
  participants: {
    userId: string;
    unreadCount: number;
    user: ConversationParticipantSummary;
  }[];
};

export const toConversationPreview = (
  conversation: ConversationWithParticipantsRow,
  callerId: string,
  presenceByUserId: Map<string, ConversationParticipantPresence>,
): ConversationPreview => {
  const callerParticipant = conversation.participants.find((p) => p.userId === callerId);
  const otherParticipant = conversation.participants.find((p) => p.userId !== callerId);
  const presence = otherParticipant ? presenceByUserId.get(otherParticipant.userId) : undefined;

  return {
    id: conversation.id,
    type: conversation.type,
    otherParticipant: otherParticipant
      ? {
          ...otherParticipant.user,
          isOnline: presence?.isOnline ?? false,
          lastSeenAt: presence?.lastSeenAt ?? null,
        }
      : null,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt ? conversation.lastMessageAt.toISOString() : null,
    unreadCount: callerParticipant?.unreadCount ?? 0,
    updatedAt: conversation.updatedAt.toISOString(),
  };
};
