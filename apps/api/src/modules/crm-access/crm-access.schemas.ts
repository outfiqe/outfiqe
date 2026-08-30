import { z } from "zod";

import { MembershipStatus } from "#generated/prisma/enums.js";

import {
  CUSTOM_ROLE_NAME_MAX_LENGTH,
  CUSTOM_ROLE_NAME_MIN_LENGTH,
  ORGANIZATION_NAME_MAX_LENGTH,
  ORGANIZATION_NAME_MIN_LENGTH,
  SUBDOMAIN_REGEX,
} from "./crm-access.constants.js";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  subdomain: z
    .string()
    .min(1)
    .max(63)
    .regex(SUBDOMAIN_REGEX, "Subdomain must be lowercase letters, numbers, and hyphens only."),
  targetOwnerUserId: z.uuid().optional(),
  linkedBrandId: z.uuid().optional(),
});

export const suggestOrganizationQuerySchema = z.object({
  brandId: z.uuid(),
});

export const createOrganizationInviteSchema = z.object({
  email: z.email(),
  roleId: z.uuid(),
});

export const acceptOrganizationInviteSchema = z.object({
  token: z.string().min(1),
});

export const updateMembershipSchema = z
  .object({
    roleId: z.uuid().optional(),
    status: z.enum(MembershipStatus).optional(),
  })
  .refine((body) => body.roleId !== undefined || body.status !== undefined, {
    message: "At least one of roleId or status must be provided.",
  });

export const membershipIdParamsSchema = z.object({
  membershipId: z.uuid(),
});

const roleName = z
  .string()
  .trim()
  .min(CUSTOM_ROLE_NAME_MIN_LENGTH)
  .max(CUSTOM_ROLE_NAME_MAX_LENGTH);

const rolePermissionKeys = z.array(z.string().min(1)).nonempty();

export const createRoleSchema = z.object({
  name: roleName,
  permissionKeys: rolePermissionKeys,
});

export const updateRoleSchema = z
  .object({
    name: roleName.optional(),
    permissionKeys: rolePermissionKeys.optional(),
  })
  .refine((body) => body.name !== undefined || body.permissionKeys !== undefined, {
    message: "At least one of name or permissionKeys must be provided.",
  });

export const roleIdParamsSchema = z.object({
  roleId: z.uuid(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(ORGANIZATION_NAME_MIN_LENGTH).max(ORGANIZATION_NAME_MAX_LENGTH),
});

export const inviteIdParamsSchema = z.object({
  inviteId: z.uuid(),
});

export const createOwnershipTransferSchema = z.object({
  toMembershipId: z.uuid(),
  removeSenderMembership: z.boolean().optional().default(false),
});

export const ownershipTransferIdParamsSchema = z.object({
  requestId: z.uuid(),
});

export type CreateOrganizationBody = z.infer<typeof createOrganizationSchema>;
export type SuggestOrganizationQuery = z.infer<typeof suggestOrganizationQuerySchema>;
export type CreateOrganizationInviteBody = z.infer<typeof createOrganizationInviteSchema>;
export type AcceptOrganizationInviteBody = z.infer<typeof acceptOrganizationInviteSchema>;
export type UpdateMembershipBody = z.infer<typeof updateMembershipSchema>;
export type MembershipIdParams = z.infer<typeof membershipIdParamsSchema>;
export type InviteIdParams = z.infer<typeof inviteIdParamsSchema>;
export type CreateOwnershipTransferBody = z.infer<typeof createOwnershipTransferSchema>;
export type OwnershipTransferIdParams = z.infer<typeof ownershipTransferIdParamsSchema>;
export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;
export type RoleIdParams = z.infer<typeof roleIdParamsSchema>;
export type UpdateOrganizationBody = z.infer<typeof updateOrganizationSchema>;
