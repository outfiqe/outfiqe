import { z } from "zod";

export const membershipStatusSchema = z.enum(["ACTIVE", "DEACTIVATED"]);
export type MembershipStatusValue = z.infer<typeof membershipStatusSchema>;

export const organizationInviteStatusSchema = z.enum(["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
export type OrganizationInviteStatusValue = z.infer<typeof organizationInviteStatusSchema>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan: z.string(),
  trialEndsAt: z.string().nullable(),
  superAdminMembershipId: z.string().nullable(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Role = z.infer<typeof roleSchema>;

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
