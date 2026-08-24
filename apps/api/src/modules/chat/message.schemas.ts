import { z } from "zod";

import {
  MESSAGE_MAX_ATTACHMENTS,
  MESSAGE_MAX_LENGTH,
  MESSAGES_DEFAULT_PAGE_SIZE,
  MESSAGES_MAX_PAGE_SIZE,
} from "./chat.constants.js";

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
