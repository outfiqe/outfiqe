import type { Request, Response } from "express";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ConversationIdParam } from "./conversation.schemas.js";
import type {
  AddGroupMembersBody,
  ChangeMemberRoleBody,
  CreateGroupBody,
  GroupMemberParams,
  RenameGroupBody,
} from "./group.schemas.js";
import { groupService } from "./group.service.js";

export const groupController = {
  async create(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateGroupBody>(res);

    const conversation = await groupService.createGroup(
      userId,
      body,
      req.header(IDEMPOTENCY_HEADER),
    );
    sendSuccess(res, conversation, "Group created.", HTTP_STATUS.CREATED);
  },

  async rename(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);
    const { name } = validated.body<RenameGroupBody>(res);

    sendSuccess(res, await groupService.renameGroup(userId, id, name), "Group renamed.");
  },

  async listMembers(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);

    sendSuccess(res, await groupService.listMembers(userId, id), "Group members.");
  },

  async addMembers(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);
    const { userIds } = validated.body<AddGroupMembersBody>(res);

    sendSuccess(res, await groupService.addMembers(userId, id, userIds), "Members added.");
  },

  async changeMemberRole(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id, userId: memberId } = validated.params<GroupMemberParams>(res);
    const { role } = validated.body<ChangeMemberRoleBody>(res);

    sendSuccess(
      res,
      await groupService.changeMemberRole(userId, id, memberId, role),
      "Member role updated.",
    );
  },

  async removeMember(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id, userId: memberId } = validated.params<GroupMemberParams>(res);

    sendSuccess(res, await groupService.removeMember(userId, id, memberId), "Member removed.");
  },

  async leave(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ConversationIdParam>(res);

    await groupService.leaveGroup(userId, id);
    sendSuccess(res, {}, "You left the group.");
  },
};
