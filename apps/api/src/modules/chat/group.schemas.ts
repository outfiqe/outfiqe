import { z } from "zod";

import { ConversationMemberRole } from "#generated/prisma/enums.js";

import { GROUP_MEMBER_CHANGE_MAX_USERS, GROUP_NAME_MAX_LENGTH } from "./chat.constants.js";

const groupNameSchema = z.string().trim().min(1).max(GROUP_NAME_MAX_LENGTH);
const memberIdsSchema = z.array(z.uuid()).min(1).max(GROUP_MEMBER_CHANGE_MAX_USERS);

export const createGroupBodySchema = z
  .object({ name: groupNameSchema, memberIds: memberIdsSchema })
  .strict();

export const renameGroupBodySchema = z.object({ name: groupNameSchema }).strict();

export const addGroupMembersBodySchema = z.object({ userIds: memberIdsSchema }).strict();

export const groupMemberParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });

export const changeMemberRoleBodySchema = z
  .object({ role: z.enum(ConversationMemberRole) })
  .strict();

export type CreateGroupBody = z.infer<typeof createGroupBodySchema>;
export type RenameGroupBody = z.infer<typeof renameGroupBodySchema>;
export type AddGroupMembersBody = z.infer<typeof addGroupMembersBodySchema>;
export type GroupMemberParams = z.infer<typeof groupMemberParamsSchema>;
export type ChangeMemberRoleBody = z.infer<typeof changeMemberRoleBodySchema>;
