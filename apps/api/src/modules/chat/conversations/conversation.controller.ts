import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ConversationIdParam,
  ListConversationsQuery,
  StartConversationBody,
} from "./conversation.schemas.js";
import { conversationService } from "./conversation.service.js";

export const conversationController = {
  async start(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { userId: targetUserId } = validated.body<StartConversationBody>(res);

    const conversation = await conversationService.startDirectConversation(userId, targetUserId);
    sendSuccess(res, conversation, "Conversation started.");
  },

  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListConversationsQuery>(res);

    const page = await conversationService.listConversations(userId, query);
    sendSuccess(res, page, "Conversations.");
  },

  async get(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);

    const conversation = await conversationService.getConversation(userId, id);
    sendSuccess(res, conversation, "Conversation.");
  },
};
