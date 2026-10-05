import type { ConversationMemberRole } from "#generated/prisma/enums.js";

import type { ConversationParticipantSummary } from "./conversation.types.js";

export type ConversationMemberView = ConversationParticipantSummary & {
  role: ConversationMemberRole;
  joinedAt: string;
};

export type GroupMembersView = { members: ConversationMemberView[] };

export type LockedConversation = { id: string; type: string };
