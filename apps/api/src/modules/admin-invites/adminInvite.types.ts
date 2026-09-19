export type AdminInviteRecord = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  invitedById: string;
};

export type AdminInviteWithRoleName = AdminInviteRecord & { roleName: string };

export type CreateAdminInviteInput = {
  email: string;
  name: string;
  roleId: string;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
};

export type AdminInviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

export type AdminInviteSummary = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  status: AdminInviteStatus;
  isCoFounder: boolean;
  createdAt: Date;
  expiresAt: Date;
};

export type AdminInviteListResult = {
  invites: AdminInviteSummary[];
  viewerPermissionKeys: string[];
};
