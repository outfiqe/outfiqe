import { RESERVED_SUBDOMAINS, SUBDOMAIN_REGEX } from "./crm-access.constants.js";
import type {
  MembershipJoinRow,
  MembershipSummary,
  MembershipWithRole,
  OrganizationInviteRecord,
  OrganizationInviteStatus,
  OrganizationInviteSummary,
  OrganizationRecord,
  OrganizationWithViewerContext,
} from "./crm-access.types.js";

export const toOrganizationWithViewerContext = (
  organization: OrganizationRecord,
  viewerMembership: MembershipWithRole,
): OrganizationWithViewerContext => ({
  ...organization,
  viewerIsSuperAdmin: organization.superAdminMembershipId === viewerMembership.id,
  viewerPermissionKeys: viewerMembership.role.permissionKeys,
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

export const extractSubdomain = (hostHeader: string, baseDomain: string): string | null => {
  const host = (hostHeader.split(":").at(0) ?? "").toLowerCase();
  const base = baseDomain.toLowerCase();

  if (host === base || !host.endsWith(`.${base}`)) return null;

  const candidate = host.slice(0, host.length - base.length - 1);
  if (!SUBDOMAIN_REGEX.test(candidate) || RESERVED_SUBDOMAINS.includes(candidate)) return null;

  return candidate;
};
