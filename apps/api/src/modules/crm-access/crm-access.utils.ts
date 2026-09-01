import { extractTenantSubdomain } from "@outfiqe/utils";

import { SELECTABLE_ROLE_PERMISSION_KEYS } from "./crm-access.constants.js";
import type {
  MembershipJoinRow,
  MembershipSummary,
  MembershipWithRole,
  OrganizationInviteRecord,
  OrganizationInviteStatus,
  OrganizationInviteSummary,
  OrganizationRecord,
  OrganizationWithViewerContext,
  OwnershipTransferJoinRow,
  PendingOwnershipTransferSummary,
} from "./crm-access.types.js";

export const toOrganizationWithViewerContext = (
  organization: OrganizationRecord,
  viewerMembership: MembershipWithRole,
  pendingOwnershipTransfer: PendingOwnershipTransferSummary | null,
  advancedFeaturesEnabled: boolean,
  features: Record<string, boolean>,
): OrganizationWithViewerContext => ({
  ...organization,
  viewerIsSuperAdmin: organization.superAdminMembershipId === viewerMembership.id,
  viewerPermissionKeys: viewerMembership.role.permissionKeys,
  pendingOwnershipTransfer,
  advancedFeaturesEnabled,
  features,
});

export const toPendingOwnershipTransferSummary = (
  request: OwnershipTransferJoinRow,
): PendingOwnershipTransferSummary => ({
  id: request.id,
  toMembershipId: request.toMembershipId,
  toUserId: request.toMembership.userId,
  toUserName: request.toMembership.user.name,
  fromUserName: request.fromMembership.user.name,
  removeSenderMembershipOnAccept: request.removeSenderMembershipOnAccept,
  expiresAt: request.expiresAt,
});

export const toMembershipSummary = (
  membership: MembershipJoinRow,
  superAdminMembershipId: string | null,
): MembershipSummary => ({
  id: membership.id,
  userId: membership.userId,
  userName: membership.user.name,
  userEmail: membership.user.email,
  roleId: membership.roleId,
  roleName: membership.role.name,
  status: membership.status,
  isSuperAdmin: superAdminMembershipId === membership.id,
  createdAt: membership.createdAt,
});

const toInviteStatus = (invite: OrganizationInviteRecord): OrganizationInviteStatus => {
  if (invite.acceptedAt) return "ACCEPTED";
  if (invite.revokedAt) return "REVOKED";
  if (invite.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  return "PENDING";
};

export const toInviteSummary = (
  invite: OrganizationInviteRecord & { roleName: string },
): OrganizationInviteSummary => ({
  id: invite.id,
  email: invite.email,
  roleId: invite.roleId,
  roleName: invite.roleName,
  status: toInviteStatus(invite),
  createdAt: invite.createdAt,
  expiresAt: invite.expiresAt,
});

export const buildOrganizationAdminUrl = (
  organization: Pick<OrganizationRecord, "subdomain" | "isPlatformOrg">,
  path: string,
  adminUrl: string,
  tenantBaseDomain: string,
): string => {
  if (organization.isPlatformOrg) return `${adminUrl}${path}`;

  const { protocol, port, pathname } = new URL(adminUrl);
  const tenantPort = port ? `:${port}` : "";
  return `${protocol}//${organization.subdomain}.${tenantBaseDomain}${tenantPort}${pathname}${path}`;
};

const selectableRolePermissionKeys = new Set(SELECTABLE_ROLE_PERMISSION_KEYS);

export const findUnselectablePermissionKeys = (permissionKeys: string[]): string[] =>
  permissionKeys.filter((key) => !selectableRolePermissionKeys.has(key));

export const canDeleteRole = (role: { isBuiltIn: boolean }, memberCount: number): boolean =>
  !role.isBuiltIn && memberCount === 0;

export const extractSubdomain = extractTenantSubdomain;
