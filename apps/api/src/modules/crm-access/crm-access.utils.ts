import type {
  MembershipJoinRow,
  MembershipSummary,
  OrganizationInviteRecord,
  OrganizationInviteStatus,
  OrganizationInviteSummary,
} from "./crm-access.types.js";

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
