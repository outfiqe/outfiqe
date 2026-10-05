import { z } from "zod";

import {
  CHAT_SYSTEM_EVENT,
  MESSAGE_MAX_ATTACHMENTS,
  MESSAGE_MAX_LENGTH,
  MESSAGES_DEFAULT_PAGE_SIZE,
  MESSAGES_MAX_PAGE_SIZE,
} from "./chat.constants.js";

const chatMemberReferenceSchema = z.object({ id: z.string(), name: z.string() });

export const chatSystemEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.GROUP_CREATED), groupName: z.string() }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.GROUP_RENAMED), groupName: z.string() }),
  z.object({
    type: z.literal(CHAT_SYSTEM_EVENT.MEMBERS_ADDED),
    members: z.array(chatMemberReferenceSchema),
  }),
  z.object({
    type: z.literal(CHAT_SYSTEM_EVENT.MEMBER_REMOVED),
    member: chatMemberReferenceSchema,
  }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.MEMBER_LEFT) }),
  z.object({
    type: z.literal(CHAT_SYSTEM_EVENT.ADMIN_ASSIGNED),
    member: chatMemberReferenceSchema,
  }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.ADMIN_REMOVED), member: chatMemberReferenceSchema }),
  z.object({
    type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_EDITORS_ADDED),
    members: z.array(chatMemberReferenceSchema),
  }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_ITEM_ADDED), productName: z.string() }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_ITEM_SWAPPED), productName: z.string() }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_ITEM_REMOVED), productName: z.string() }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_EVERYONE_HAPPY) }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_LOCKED) }),
  z.object({ type: z.literal(CHAT_SYSTEM_EVENT.OUTFIT_UNLOCKED) }),
]);

export type ChatSystemEvent = z.infer<typeof chatSystemEventSchema>;
export type ChatMemberReference = z.infer<typeof chatMemberReferenceSchema>;

const messageAttachmentInputSchema = z.object({
  url: z.url(),
  mimeType: z.string().min(1),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MESSAGES_MAX_PAGE_SIZE)
    .default(MESSAGES_DEFAULT_PAGE_SIZE),
});

export const sendMessageBodySchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH).optional(),
  attachments: z.array(messageAttachmentInputSchema).max(MESSAGE_MAX_ATTACHMENTS).default([]),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
