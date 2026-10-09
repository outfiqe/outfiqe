import { type Request, type Response, Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  GROUP_CREATE_RATE_LIMIT_MAX_REQUESTS,
  GROUP_CREATE_RATE_LIMIT_NAMESPACE,
  GROUP_CREATE_RATE_LIMIT_WINDOW_MS,
  GROUP_MANAGE_RATE_LIMIT_MAX_REQUESTS,
  GROUP_MANAGE_RATE_LIMIT_NAMESPACE,
  GROUP_MANAGE_RATE_LIMIT_WINDOW_MS,
  MESSAGE_SEND_RATE_LIMIT_MAX_REQUESTS,
  MESSAGE_SEND_RATE_LIMIT_NAMESPACE,
  MESSAGE_SEND_RATE_LIMIT_WINDOW_MS,
} from "../chat.constants.js";
import { groupController } from "../groups/group.controller.js";
import {
  addGroupMembersBodySchema,
  changeMemberRoleBodySchema,
  createGroupBodySchema,
  groupMemberParamsSchema,
  renameGroupBodySchema,
} from "../groups/group.schemas.js";
import { messageController } from "../messages/message.controller.js";
import { listMessagesQuerySchema, sendMessageBodySchema } from "../messages/message.schemas.js";
import { conversationController } from "./conversation.controller.js";
import {
  conversationIdParamSchema,
  listConversationsQuerySchema,
  startConversationBodySchema,
} from "./conversation.schemas.js";

const perUserKey = (_req: Request, res: Response) => getAuthPrincipal(res)?.userId;

const messageSendRateLimit = rateLimit({
  namespace: MESSAGE_SEND_RATE_LIMIT_NAMESPACE,
  windowMs: MESSAGE_SEND_RATE_LIMIT_WINDOW_MS,
  max: MESSAGE_SEND_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: perUserKey,
});

const groupCreateRateLimit = rateLimit({
  namespace: GROUP_CREATE_RATE_LIMIT_NAMESPACE,
  windowMs: GROUP_CREATE_RATE_LIMIT_WINDOW_MS,
  max: GROUP_CREATE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: perUserKey,
});

const groupManageRateLimit = rateLimit({
  namespace: GROUP_MANAGE_RATE_LIMIT_NAMESPACE,
  windowMs: GROUP_MANAGE_RATE_LIMIT_WINDOW_MS,
  max: GROUP_MANAGE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: perUserKey,
});

export const conversationRoutes = Router();

conversationRoutes.post(
  "/",
  ...requireActiveAuth,
  validate({ body: startConversationBodySchema }),
  conversationController.start,
);
conversationRoutes.post(
  "/groups",
  ...requireActiveAuth,
  groupCreateRateLimit,
  validate({ body: createGroupBodySchema }),
  groupController.create,
);
conversationRoutes.patch(
  "/:id",
  ...requireActiveAuth,
  groupManageRateLimit,
  validate({ params: conversationIdParamSchema, body: renameGroupBodySchema }),
  groupController.rename,
);
conversationRoutes.get(
  "/:id/members",
  ...requireActiveAuth,
  validate({ params: conversationIdParamSchema }),
  groupController.listMembers,
);
conversationRoutes.post(
  "/:id/members",
  ...requireActiveAuth,
  groupManageRateLimit,
  validate({ params: conversationIdParamSchema, body: addGroupMembersBodySchema }),
  groupController.addMembers,
);
conversationRoutes.patch(
  "/:id/members/:userId",
  ...requireActiveAuth,
  groupManageRateLimit,
  validate({ params: groupMemberParamsSchema, body: changeMemberRoleBodySchema }),
  groupController.changeMemberRole,
);
conversationRoutes.delete(
  "/:id/members/:userId",
  ...requireActiveAuth,
  groupManageRateLimit,
  validate({ params: groupMemberParamsSchema }),
  groupController.removeMember,
);
conversationRoutes.post(
  "/:id/leave",
  ...requireActiveAuth,
  validate({ params: conversationIdParamSchema }),
  groupController.leave,
);
conversationRoutes.get(
  "/",
  ...requireActiveAuth,
  validate({ query: listConversationsQuerySchema }),
  conversationController.list,
);
conversationRoutes.get(
  "/:id",
  ...requireActiveAuth,
  validate({ params: conversationIdParamSchema }),
  conversationController.get,
);
conversationRoutes.get(
  "/:id/messages",
  ...requireActiveAuth,
  validate({ params: conversationIdParamSchema, query: listMessagesQuerySchema }),
  messageController.list,
);
conversationRoutes.post(
  "/:id/messages",
  ...requireActiveAuth,
  messageSendRateLimit,
  validate({ params: conversationIdParamSchema, body: sendMessageBodySchema }),
  messageController.send,
);
conversationRoutes.patch(
  "/:id/read",
  ...requireActiveAuth,
  validate({ params: conversationIdParamSchema }),
  messageController.markRead,
);
