import type { MessageBroadcastPayload } from "#events/event-bus.types.js";
import { MessageKind } from "#generated/prisma/enums.js";

import { CHAT_SYSTEM_EVENT } from "./chat.constants.js";
import type { ConversationParticipantSummary } from "./conversation.types.js";
import {
  type ChatMemberReference,
  type ChatSystemEvent,
  chatSystemEventSchema,
} from "./message.schemas.js";
import type { MessageAttachmentRecord, MessageRecord } from "./message.types.js";

const MESSAGE_PREVIEW_LENGTH = 140;
const PHOTO_PREVIEW_TEXT = "Sent a photo";
const LAST_NAME_COUNT = 1;

export const messagePreviewFor = (body: string | null): string =>
  body ? body.slice(0, MESSAGE_PREVIEW_LENGTH) : PHOTO_PREVIEW_TEXT;

export const conversationPreviewFor = (body: string | null, groupSenderName: string | null) =>
  groupSenderName ? `${groupSenderName}: ${messagePreviewFor(body)}` : messagePreviewFor(body);

const joinNames = (members: ChatMemberReference[]): string => {
  const names = members.map(({ name }) => name);
  if (names.length <= LAST_NAME_COUNT) return names.join("");
  return `${names.slice(0, -LAST_NAME_COUNT).join(", ")} and ${names.at(-LAST_NAME_COUNT)}`;
};

export const describeSystemEvent = (event: ChatSystemEvent, actorName: string): string => {
  switch (event.type) {
    case CHAT_SYSTEM_EVENT.GROUP_CREATED:
      return `${actorName} created the group`;
    case CHAT_SYSTEM_EVENT.GROUP_RENAMED:
      return `${actorName} renamed the group to "${event.groupName}"`;
    case CHAT_SYSTEM_EVENT.MEMBERS_ADDED:
      return `${actorName} added ${joinNames(event.members)}`;
    case CHAT_SYSTEM_EVENT.MEMBER_REMOVED:
      return `${actorName} removed ${event.member.name}`;
    case CHAT_SYSTEM_EVENT.MEMBER_LEFT:
      return `${actorName} left`;
    case CHAT_SYSTEM_EVENT.ADMIN_ASSIGNED:
      return `${actorName} made ${event.member.name} an admin`;
    case CHAT_SYSTEM_EVENT.ADMIN_REMOVED:
      return `${actorName} removed ${event.member.name} as an admin`;
    case CHAT_SYSTEM_EVENT.OUTFIT_EDITORS_ADDED:
      return `${actorName} added ${joinNames(event.members)} to the build`;
    case CHAT_SYSTEM_EVENT.OUTFIT_ITEM_ADDED:
      return `${actorName} added ${event.productName}`;
    case CHAT_SYSTEM_EVENT.OUTFIT_ITEM_SWAPPED:
      return `${actorName} swapped in ${event.productName}`;
    case CHAT_SYSTEM_EVENT.OUTFIT_ITEM_REMOVED:
      return `${actorName} removed ${event.productName}`;
    case CHAT_SYSTEM_EVENT.OUTFIT_EVERYONE_HAPPY:
      return "Everyone's happy. The build is ready to lock";
    case CHAT_SYSTEM_EVENT.OUTFIT_LOCKED:
      return `${actorName} locked the build`;
    case CHAT_SYSTEM_EVENT.OUTFIT_UNLOCKED:
      return `${actorName} unlocked the build`;
  }
};

export const parseSystemEvent = (storedEvent: unknown): ChatSystemEvent | null => {
  if (storedEvent === null || storedEvent === undefined) return null;
  const parsed = chatSystemEventSchema.safeParse(storedEvent);
  return parsed.success ? parsed.data : null;
};

export const usersNotifiedBySystemEvent = (event: ChatSystemEvent | null): string[] =>
  event?.type === CHAT_SYSTEM_EVENT.MEMBERS_ADDED ? event.members.map(({ id }) => id) : [];

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: ConversationParticipantSummary;
  kind: MessageKind;
  systemEvent: unknown;
  outfitId: string | null;
  body: string | null;
  attachments: MessageAttachmentRecord[];
  createdAt: Date;
};

export type ReaderCursor = {
  lastReadAt: Date | null;
  lastDeliveredAt: Date | null;
};

const earliestOf = (moments: (Date | null)[]): Date | null => {
  if (moments.length === 0 || moments.some((moment) => moment === null)) return null;
  return moments.reduce<Date | null>(
    (earliest, moment) => (earliest === null || (moment && moment < earliest) ? moment : earliest),
    null,
  );
};

export const combineReaderCursors = (otherReaders: ReaderCursor[]): ReaderCursor | null => {
  if (otherReaders.length === 0) return null;
  return {
    lastReadAt: earliestOf(otherReaders.map(({ lastReadAt }) => lastReadAt)),
    lastDeliveredAt: earliestOf(otherReaders.map(({ lastDeliveredAt }) => lastDeliveredAt)),
  };
};

export const toMessageBroadcast = (
  message: MessageRow,
  recipientIds: string[],
): MessageBroadcastPayload => {
  const { id, conversationId, senderId, sender, kind, body, attachments, createdAt } = message;
  return {
    id,
    conversationId,
    senderId,
    senderName: sender.name,
    senderHandle: sender.handle,
    senderAvatarUrl: sender.avatarUrl,
    kind,
    systemEvent: kind === MessageKind.SYSTEM ? parseSystemEvent(message.systemEvent) : null,
    outfitId: message.outfitId,
    body,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      mimeType: attachment.mimeType,
      width: attachment.width,
      height: attachment.height,
    })),
    createdAt: createdAt.toISOString(),
    recipientIds,
  };
};

export const toMessageRecord = (
  row: MessageRow,
  callerId: string,
  otherReaders: ReaderCursor | null,
): MessageRecord => {
  const isMine = row.senderId === callerId;
  const isUserMessage = row.kind === MessageKind.USER;
  const lastReadAt = otherReaders?.lastReadAt ?? null;
  const lastDeliveredAt = otherReaders?.lastDeliveredAt ?? null;

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    sender: row.sender,
    kind: row.kind,
    systemEvent: row.kind === MessageKind.SYSTEM ? parseSystemEvent(row.systemEvent) : null,
    outfitId: row.outfitId,
    body: row.body,
    attachments: row.attachments,
    createdAt: row.createdAt.toISOString(),
    isMine,
    isDeliveredToOthers:
      isMine && isUserMessage && lastDeliveredAt !== null && row.createdAt <= lastDeliveredAt,
    isReadByOthers: isMine && isUserMessage && lastReadAt !== null && row.createdAt <= lastReadAt,
  };
};
