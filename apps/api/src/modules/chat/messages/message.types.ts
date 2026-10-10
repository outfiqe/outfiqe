import type { MessageKind } from "#generated/prisma/enums.js";

import type { ConversationParticipantSummary } from "../conversations/conversation.types.js";
import type { ChatSystemEvent } from "./message.schemas.js";

export type MessageAttachmentRecord = {
  id: string;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

export type NewMessageAttachmentInput = {
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: ConversationParticipantSummary;
  kind: MessageKind;
  systemEvent: ChatSystemEvent | null;
  outfitId: string | null;
  body: string | null;
  attachments: MessageAttachmentRecord[];
  createdAt: string;
  isMine: boolean;
  isDeliveredToOthers: boolean;
  isReadByOthers: boolean;
};

export type MessagesPage = {
  items: MessageRecord[];
  nextCursor: string | null;
};
