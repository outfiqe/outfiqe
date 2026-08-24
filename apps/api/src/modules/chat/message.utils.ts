import type { ConversationParticipantSummary } from "./conversation.types.js";
import type { MessageAttachmentRecord, MessageRecord } from "./message.types.js";

const MESSAGE_PREVIEW_LENGTH = 140;
const PHOTO_PREVIEW_TEXT = "Sent a photo";

export const messagePreviewFor = (body: string | null): string =>
  body ? body.slice(0, MESSAGE_PREVIEW_LENGTH) : PHOTO_PREVIEW_TEXT;

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: ConversationParticipantSummary;
  body: string | null;
  attachments: MessageAttachmentRecord[];
  createdAt: Date;
};

export const toMessageRecord = (
  row: MessageRow,
  callerId: string,
  otherParticipantLastReadAt: Date | null,
): MessageRecord => {
  const isMine = row.senderId === callerId;
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    sender: row.sender,
    body: row.body,
    attachments: row.attachments,
    createdAt: row.createdAt.toISOString(),
    isMine,
    isReadByOthers:
      isMine && otherParticipantLastReadAt !== null && row.createdAt <= otherParticipantLastReadAt,
  };
};
