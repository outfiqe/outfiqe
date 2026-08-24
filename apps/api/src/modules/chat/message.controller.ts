import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ConversationIdParam } from "./conversation.schemas.js";
import type { ListMessagesQuery, SendMessageBody } from "./message.schemas.js";
import { messageService } from "./message.service.js";

export const messageController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);
    const query = validated.query<ListMessagesQuery>(res);

    const page = await messageService.listMessages(userId, id, query);
    sendSuccess(res, page, "Messages.");
  },

  async send(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);
    const { body, attachments } = validated.body<SendMessageBody>(res);

    const message = await messageService.sendMessage(userId, id, body, attachments);
    sendSuccess(res, message, "Message sent.");
  },

  async markRead(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);

    await messageService.markRead(userId, id);
    sendSuccess(res, {}, "Marked as read.");
  },
};
