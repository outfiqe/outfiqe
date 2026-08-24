import type { ConversationParticipantSummary } from "./conversation.types.js";

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
