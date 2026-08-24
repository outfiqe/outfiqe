import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ChatBlockTargetParam,
  ListChatBlocksQuery,
  SearchChatContactsQuery,
  UpdateChatSettingsBody,
} from "./chat.schemas.js";
import { chatService } from "./chat.service.js";

export const chatController = {
  async getSettings(_req: Request, res: Response) {
    const { userId, role } = requireAuthPrincipal(res);

    const settings = await chatService.getSettings(userId, role);
    sendSuccess(res, settings, "Chat settings.");
  },

  async updateSettings(_req: Request, res: Response) {
    const { userId, role } = requireAuthPrincipal(res);
    const { isChatEnabled } = validated.body<UpdateChatSettingsBody>(res);

    const settings = await chatService.setGlobalChatEnabled(userId, role, isChatEnabled);
    sendSuccess(res, settings, "Chat settings updated.");
  },

  async listBlocks(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListChatBlocksQuery>(res);

    const page = await chatService.listBlockedUsers(userId, query);
    sendSuccess(res, page, "Blocked chat contacts.");
  },

  async blockUser(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { userId: targetId } = validated.params<ChatBlockTargetParam>(res);

    await chatService.blockUser(userId, targetId);
    sendSuccess(res, { blocked: true }, "Chat turned off with this person.");
  },

  async unblockUser(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { userId: targetId } = validated.params<ChatBlockTargetParam>(res);

    await chatService.unblockUser(userId, targetId);
    sendSuccess(res, { blocked: false }, "Chat turned back on with this person.");
  },

  async searchContacts(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { q } = validated.query<SearchChatContactsQuery>(res);

    const contacts = await chatService.searchContacts(userId, q);
    sendSuccess(res, { contacts }, "Chat contacts.");
  },
};
