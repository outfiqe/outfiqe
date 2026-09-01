import { z } from "zod";

export const membershipStatusSchema = z.enum(["ACTIVE", "DEACTIVATED"]);
export type MembershipStatusValue = z.infer<typeof membershipStatusSchema>;

export const organizationInviteStatusSchema = z.enum(["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
export type OrganizationInviteStatusValue = z.infer<typeof organizationInviteStatusSchema>;

export const pendingOwnershipTransferSchema = z.object({
  id: z.string(),
  toMembershipId: z.string(),
  toUserId: z.string(),
  toUserName: z.string(),
  fromUserName: z.string(),
  removeSenderMembershipOnAccept: z.boolean(),
  expiresAt: z.string(),
});
export type PendingOwnershipTransfer = z.infer<typeof pendingOwnershipTransferSchema>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan: z.string(),
  trialEndsAt: z.string().nullable(),
  linkedBrandId: z.string().nullable(),
  superAdminMembershipId: z.string().nullable(),
  viewerIsSuperAdmin: z.boolean(),
  viewerPermissionKeys: z.array(z.string()),
  pendingOwnershipTransfer: pendingOwnershipTransferSchema.nullable(),
  advancedFeaturesEnabled: z.boolean(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  isBuiltIn: z.boolean(),
  permissionKeys: z.array(z.string()),
});
export type Role = z.infer<typeof roleSchema>;

export const permissionSchema = z.object({
  key: z.string(),
  label: z.string(),
  group: z.string(),
});
export type Permission = z.infer<typeof permissionSchema>;

export const membershipSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  status: membershipStatusSchema,
  isSuperAdmin: z.boolean(),
  createdAt: z.string(),
});
export type MembershipSummary = z.infer<typeof membershipSummarySchema>;

export const organizationInviteSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  status: organizationInviteStatusSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type OrganizationInviteSummary = z.infer<typeof organizationInviteSummarySchema>;
