import { z } from "zod";

import { MembershipStatus } from "#generated/prisma/enums.js";
import {
  CUSTOM_ROLE_NAME_MAX_LENGTH,
  CUSTOM_ROLE_NAME_MIN_LENGTH,
} from "#modules/crm-access/crm-access.constants.js";

const platformRoleName = z
  .string()
  .trim()
  .min(CUSTOM_ROLE_NAME_MIN_LENGTH)
  .max(CUSTOM_ROLE_NAME_MAX_LENGTH);

const platformRolePermissionKeys = z.array(z.string().min(1)).nonempty();

export const createPlatformRoleSchema = z.object({
  name: platformRoleName,
  permissionKeys: platformRolePermissionKeys,
});

export const updatePlatformRoleSchema = z
  .object({
    name: platformRoleName.optional(),
    permissionKeys: platformRolePermissionKeys.optional(),
  })
  .refine((body) => body.name !== undefined || body.permissionKeys !== undefined, {
    message: "At least one of name or permissionKeys must be provided.",
  });

export const platformRoleIdParamsSchema = z.object({
  roleId: z.uuid(),
});

export const updatePlatformTeamMemberSchema = z
  .object({
    roleId: z.uuid().optional(),
    status: z.enum(MembershipStatus).optional(),
  })
  .refine((body) => body.roleId !== undefined || body.status !== undefined, {
    message: "At least one of roleId or status must be provided.",
  });

export const platformTeamMembershipIdParamsSchema = z.object({
  membershipId: z.uuid(),
});

export type CreatePlatformRoleBody = z.infer<typeof createPlatformRoleSchema>;
export type UpdatePlatformRoleBody = z.infer<typeof updatePlatformRoleSchema>;
export type PlatformRoleIdParams = z.infer<typeof platformRoleIdParamsSchema>;
export type UpdatePlatformTeamMemberBody = z.infer<typeof updatePlatformTeamMemberSchema>;
export type PlatformTeamMembershipIdParams = z.infer<typeof platformTeamMembershipIdParamsSchema>;
