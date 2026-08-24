import type { BlockedChatContact, ChatContact } from "./chat.types.js";

type BlockedChatContactRow = {
  blockedId: string;
  createdAt: Date;
  blocked: ChatContact;
};

export const toBlockedChatContact = (row: BlockedChatContactRow): BlockedChatContact => ({
  ...row.blocked,
  blockedAt: row.createdAt,
});
