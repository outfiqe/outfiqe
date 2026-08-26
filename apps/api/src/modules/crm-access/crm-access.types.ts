import type { MembershipStatus } from "#generated/prisma/enums.js";

export interface OrganizationRecord {
  id: string;
  name: string;
  subdomain: string;
  isPlatformOrg: boolean;
  plan: string;
  trialEndsAt: Date | null;
  superAdminMembershipId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleRecord {
  id: string;
  organizationId: string;
  name: string;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleWithPermissions extends RoleRecord {
  permissionKeys: string[];
}

export interface PermissionRecord {
  key: string;
  label: string;
  group: string;
}

export interface MembershipRecord {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipWithRole extends MembershipRecord {
  role: RoleWithPermissions;
}

export interface MembershipSummary {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleId: string;
  roleName: string;
  status: MembershipStatus;
  isSuperAdmin: boolean;
  createdAt: Date;
}

export interface MembershipJoinRow {
  id: string;
  userId: string;
  roleId: string;
  status: MembershipStatus;
  createdAt: Date;
  user: { name: string; email: string };
  role: { name: string };
}

export type OrganizationInviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface OrganizationInviteRecord {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitedById: string;
  createdAt: Date;
}

export interface OrganizationInviteSummary {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: OrganizationInviteStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateOrganizationInviteInput {
  organizationId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
}

export interface CreateRoleInput {
  organizationId: string;
  name: string;
  isBuiltIn?: boolean;
  permissionKeys: string[];
}

export interface UpdateMembershipInput {
  roleId?: string;
  status?: MembershipStatus;
}
