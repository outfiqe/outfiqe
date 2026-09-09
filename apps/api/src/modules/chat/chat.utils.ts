import { AppError } from "#middlewares/error-handler.js";

import { type BlockedChatContact, type ChatContact, ChatUnavailableReason } from "./chat.types.js";

const CHAT_UNAVAILABLE_STATUS = 403;

const CHAT_UNAVAILABLE_MESSAGE: Record<ChatUnavailableReason, string> = {
  [ChatUnavailableReason.YOU_TURNED_OFF_THIS_PERSON]:
    "You've turned off chat with this person. Turn it back on from their chat to send a message.",
  [ChatUnavailableReason.YOUR_CHAT_DISABLED]:
    "Your chat is turned off. Turn chat on in Settings to send messages.",
  [ChatUnavailableReason.RECIPIENT_UNREACHABLE]: "This person isn't accepting messages right now.",
};

export const chatUnavailableError = (reason: ChatUnavailableReason): AppError =>
  new AppError("CHAT_UNAVAILABLE", CHAT_UNAVAILABLE_MESSAGE[reason], CHAT_UNAVAILABLE_STATUS);

type BlockedChatContactRow = {
  blockedId: string;
  createdAt: Date;
  blocked: ChatContact;
};

export const toBlockedChatContact = (row: BlockedChatContactRow): BlockedChatContact => ({
  ...row.blocked,
  blockedAt: row.createdAt,
});
