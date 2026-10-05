import { type ConversationMemberRole, ConversationType } from "#generated/prisma/enums.js";

import { GROUP_PREVIEW_MEMBER_COUNT } from "./chat.constants.js";
import type {
  ConversationGroupSummary,
  ConversationParticipantPresence,
  ConversationParticipantSummary,
  ConversationPreview,
} from "./conversation.types.js";

const NO_UNREAD_MESSAGES = 0;

export const buildDirectKey = (userAId: string, userBId: string): string =>
  [userAId, userBId].sort().join(":");

export const participantUserSelect = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
} as const;

type ConversationParticipantRow = {
  userId: string;
  role: ConversationMemberRole;
  unreadCount: number;
  joinedAt: Date;
  user: ConversationParticipantSummary;
};

type ConversationWithParticipantsRow = {
  id: string;
  type: ConversationType;
  name: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  updatedAt: Date;
  participants: ConversationParticipantRow[];
};

const toGroupSummary = (
  { name, participants }: ConversationWithParticipantsRow,
  callerParticipant: ConversationParticipantRow,
): ConversationGroupSummary => ({
  name: name ?? "",
  memberCount: participants.length,
  members: [...participants]
    .sort((left, right) => left.joinedAt.getTime() - right.joinedAt.getTime())
    .slice(0, GROUP_PREVIEW_MEMBER_COUNT)
    .map(({ user }) => user),
  myRole: callerParticipant.role,
});

export const otherParticipantIdOf = (
  conversation: ConversationWithParticipantsRow,
  callerId: string,
): string | null =>
  conversation.type === ConversationType.DIRECT
    ? (conversation.participants.find(({ userId }) => userId !== callerId)?.userId ?? null)
    : null;

export const toConversationPreview = (
  conversation: ConversationWithParticipantsRow,
  callerId: string,
  presenceByUserId: Map<string, ConversationParticipantPresence>,
): ConversationPreview => {
  const { id, type, participants, lastMessagePreview, lastMessageAt, updatedAt } = conversation;
  const callerParticipant = participants.find(({ userId }) => userId === callerId);
  const otherParticipantId = otherParticipantIdOf(conversation, callerId);
  const otherParticipant = participants.find(({ userId }) => userId === otherParticipantId);
  const presence = otherParticipantId ? presenceByUserId.get(otherParticipantId) : undefined;

  return {
    id,
    type,
    otherParticipant: otherParticipant
      ? {
          ...otherParticipant.user,
          isOnline: presence?.isOnline ?? false,
          lastSeenAt: presence?.lastSeenAt ?? null,
        }
      : null,
    group:
      type === ConversationType.GROUP && callerParticipant
        ? toGroupSummary(conversation, callerParticipant)
        : null,
    lastMessagePreview,
    lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
    unreadCount: callerParticipant?.unreadCount ?? NO_UNREAD_MESSAGES,
    updatedAt: updatedAt.toISOString(),
  };
};
