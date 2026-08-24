import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  MESSAGE_SEND_RATE_LIMIT_MAX_REQUESTS,
  MESSAGE_SEND_RATE_LIMIT_NAMESPACE,
  MESSAGE_SEND_RATE_LIMIT_WINDOW_MS,
} from "./chat.constants.js";
import { conversationController } from "./conversation.controller.js";
import {
  conversationIdParamSchema,
  listConversationsQuerySchema,
  startConversationBodySchema,
} from "./conversation.schemas.js";
import { messageController } from "./message.controller.js";
import { listMessagesQuerySchema, sendMessageBodySchema } from "./message.schemas.js";

const messageSendRateLimit = rateLimit({
  namespace: MESSAGE_SEND_RATE_LIMIT_NAMESPACE,
  windowMs: MESSAGE_SEND_RATE_LIMIT_WINDOW_MS,
  max: MESSAGE_SEND_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const conversationRoutes = Router();

conversationRoutes.post(
  "/",
  requireAuth,
  validate({ body: startConversationBodySchema }),
  conversationController.start,
);
conversationRoutes.get(
  "/",
  requireAuth,
  validate({ query: listConversationsQuerySchema }),
  conversationController.list,
);
conversationRoutes.get(
  "/:id",
  requireAuth,
  validate({ params: conversationIdParamSchema }),
  conversationController.get,
);
conversationRoutes.get(
  "/:id/messages",
  requireAuth,
  validate({ params: conversationIdParamSchema, query: listMessagesQuerySchema }),
  messageController.list,
);
conversationRoutes.post(
  "/:id/messages",
  requireAuth,
  messageSendRateLimit,
  validate({ params: conversationIdParamSchema, body: sendMessageBodySchema }),
  messageController.send,
);
conversationRoutes.patch(
  "/:id/read",
  requireAuth,
  validate({ params: conversationIdParamSchema }),
  messageController.markRead,
);
