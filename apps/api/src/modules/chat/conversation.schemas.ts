import { z } from "zod";

import { CONVERSATIONS_DEFAULT_PAGE_SIZE, CONVERSATIONS_MAX_PAGE_SIZE } from "./chat.constants.js";

export const startConversationBodySchema = z.object({
  userId: z.uuid(),
});

export const conversationIdParamSchema = z.object({
  id: z.uuid(),
});

export const listConversationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CONVERSATIONS_MAX_PAGE_SIZE)
    .default(CONVERSATIONS_DEFAULT_PAGE_SIZE),
  q: z.string().trim().min(1).optional(),
});

export type StartConversationBody = z.infer<typeof startConversationBodySchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
