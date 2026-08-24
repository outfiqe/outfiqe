import { z } from "zod";

import { CHAT_BLOCKS_DEFAULT_PAGE_SIZE, CHAT_BLOCKS_MAX_PAGE_SIZE } from "./chat.constants.js";

const MIN_CONTACT_QUERY_LENGTH = 1;

export const updateChatSettingsBodySchema = z.object({
  isChatEnabled: z.boolean(),
});

export const chatBlockTargetParamSchema = z.object({
  userId: z.uuid(),
});

export const listChatBlocksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CHAT_BLOCKS_MAX_PAGE_SIZE)
    .default(CHAT_BLOCKS_DEFAULT_PAGE_SIZE),
});

export const searchChatContactsQuerySchema = z.object({
  q: z.string().trim().min(MIN_CONTACT_QUERY_LENGTH),
});

export type UpdateChatSettingsBody = z.infer<typeof updateChatSettingsBodySchema>;
export type ChatBlockTargetParam = z.infer<typeof chatBlockTargetParamSchema>;
export type ListChatBlocksQuery = z.infer<typeof listChatBlocksQuerySchema>;
export type SearchChatContactsQuery = z.infer<typeof searchChatContactsQuerySchema>;
