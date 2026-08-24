import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  CHAT_SETTINGS_RATE_LIMIT_MAX_REQUESTS,
  CHAT_SETTINGS_RATE_LIMIT_NAMESPACE,
  CHAT_SETTINGS_RATE_LIMIT_WINDOW_MS,
} from "./chat.constants.js";
import { chatController } from "./chat.controller.js";
import {
  chatBlockTargetParamSchema,
  listChatBlocksQuerySchema,
  searchChatContactsQuerySchema,
  updateChatSettingsBodySchema,
} from "./chat.schemas.js";

const chatSettingsMutationRateLimit = rateLimit({
  namespace: CHAT_SETTINGS_RATE_LIMIT_NAMESPACE,
  windowMs: CHAT_SETTINGS_RATE_LIMIT_WINDOW_MS,
  max: CHAT_SETTINGS_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const chatRoutes = Router();

chatRoutes.get("/settings", requireAuth, chatController.getSettings);
chatRoutes.patch(
  "/settings",
  requireAuth,
  chatSettingsMutationRateLimit,
  validate({ body: updateChatSettingsBodySchema }),
  chatController.updateSettings,
);

chatRoutes.get(
  "/blocks/search",
  requireAuth,
  validate({ query: searchChatContactsQuerySchema }),
  chatController.searchContacts,
);
chatRoutes.get(
  "/blocks",
  requireAuth,
  validate({ query: listChatBlocksQuerySchema }),
  chatController.listBlocks,
);
chatRoutes.post(
  "/blocks/:userId",
  requireAuth,
  chatSettingsMutationRateLimit,
  validate({ params: chatBlockTargetParamSchema }),
  chatController.blockUser,
);
chatRoutes.delete(
  "/blocks/:userId",
  requireAuth,
  chatSettingsMutationRateLimit,
  validate({ params: chatBlockTargetParamSchema }),
  chatController.unblockUser,
);
