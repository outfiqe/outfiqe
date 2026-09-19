import { z } from "zod";

export const platformMembershipStatusSchema = z.enum(["ACTIVE", "DEACTIVATED"]);
export type PlatformMembershipStatusValue = z.infer<typeof platformMembershipStatusSchema>;

export const platformRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  isBuiltIn: z.boolean(),
  permissionKeys: z.array(z.string()),
});
export type PlatformRole = z.infer<typeof platformRoleSchema>;

export const platformPermissionSchema = z.object({
  key: z.string(),
  label: z.string(),
  group: z.string(),
});
export type PlatformPermission = z.infer<typeof platformPermissionSchema>;

export const platformTeamMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  status: platformMembershipStatusSchema,
  isSuperAdmin: z.boolean(),
  createdAt: z.string(),
});
export type PlatformTeamMember = z.infer<typeof platformTeamMemberSchema>;
