import type { AdminInviteRecord, AdminInviteSummary } from "./adminInvite.types.js";

export const toSummary = (invite: AdminInviteRecord, isCoFounder: boolean): AdminInviteSummary => {
  const status = invite.acceptedAt
    ? "ACCEPTED"
    : invite.expiresAt.getTime() <= Date.now()
      ? "EXPIRED"
      : "PENDING";

  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    status,
    isCoFounder,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
  };
};
