import type { MembershipStatus } from "#generated/prisma/enums.js";

export type OrganizationRecord = {
  id: string;
  name: string;
  subdomain: string;
  isPlatformOrg: boolean;
  plan: string;
  trialEndsAt: Date | null;
  superAdminMembershipId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleRecord = {
  id: string;
  organizationId: string;
  name: string;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleWithPermissions = RoleRecord & {
  permissionKeys: string[];
};

export type PermissionRecord = {
  key: string;
  label: string;
  group: string;
};

export type MembershipRecord = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type MembershipWithRole = MembershipRecord & {
  role: RoleWithPermissions;
};

export type PendingOwnershipTransferSummary = {
  id: string;
  toMembershipId: string;
  toUserId: string;
  toUserName: string;
  fromUserName: string;
  expiresAt: Date;
};

export type OrganizationWithViewerContext = OrganizationRecord & {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
  pendingOwnershipTransfer: PendingOwnershipTransferSummary | null;
};

export type MembershipSummary = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleId: string;
  roleName: string;
  status: MembershipStatus;
  isSuperAdmin: boolean;
  createdAt: Date;
};

export type MembershipJoinRow = {
  id: string;
  userId: string;
  roleId: string;
  status: MembershipStatus;
  createdAt: Date;
  user: { name: string; email: string };
  role: { name: string };
};

export type OrganizationInviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export type OrganizationInviteRecord = {
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
};

export type OrganizationInviteSummary = {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: OrganizationInviteStatus;
  createdAt: Date;
  expiresAt: Date;
};

export type CreateOrganizationInviteInput = {
  organizationId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
};

export type OwnershipTransferRequestRecord = {
  id: string;
  organizationId: string;
  fromMembershipId: string;
  toMembershipId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type CreateOwnershipTransferRequestInput = {
  organizationId: string;
  fromMembershipId: string;
  toMembershipId: string;
  expiresAt: Date;
};

export type OwnershipTransferJoinRow = OwnershipTransferRequestRecord & {
  toMembership: { userId: string; user: { name: string } };
  fromMembership: { user: { name: string } };
};

export type CreateRoleInput = {
  organizationId: string;
  name: string;
  isBuiltIn?: boolean;
  permissionKeys: string[];
};

export type UpdateMembershipInput = {
  roleId?: string;
  status?: MembershipStatus;
};
