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

export type OtherParticipantCursor = {
  lastReadAt: Date | null;
  lastDeliveredAt: Date | null;
};

export const toMessageRecord = (
  row: MessageRow,
  callerId: string,
  otherParticipant: OtherParticipantCursor | null,
): MessageRecord => {
  const isMine = row.senderId === callerId;
  const lastReadAt = otherParticipant?.lastReadAt ?? null;
  const lastDeliveredAt = otherParticipant?.lastDeliveredAt ?? null;

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    sender: row.sender,
    body: row.body,
    attachments: row.attachments,
    createdAt: row.createdAt.toISOString(),
    isMine,
    isDeliveredToOthers: isMine && lastDeliveredAt !== null && row.createdAt <= lastDeliveredAt,
    isReadByOthers: isMine && lastReadAt !== null && row.createdAt <= lastReadAt,
  };
};
