import type { ConversationMemberRole } from "#generated/prisma/enums.js";

import type { ConversationParticipantSummary } from "./conversation.types.js";
import type { ConversationMemberView } from "./group.types.js";

export const toConversationMemberView = ({
  role,
  joinedAt,
  user,
}: {
  role: ConversationMemberRole;
  joinedAt: Date;
  user: ConversationParticipantSummary;
}): ConversationMemberView => ({
  ...user,
  role,
  joinedAt: joinedAt.toISOString(),
});
