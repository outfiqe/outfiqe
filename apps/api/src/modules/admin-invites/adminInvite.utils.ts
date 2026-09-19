import type { AdminInviteSummary, AdminInviteWithRoleName } from "./adminInvite.types.js";

export const toSummary = (
  invite: AdminInviteWithRoleName,
  isCoFounder: boolean,
): AdminInviteSummary => {
  const status = invite.acceptedAt
    ? "ACCEPTED"
    : invite.expiresAt.getTime() <= Date.now()
      ? "EXPIRED"
      : "PENDING";

  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    roleId: invite.roleId,
    roleName: invite.roleName,
    status,
    isCoFounder,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
  };
};
