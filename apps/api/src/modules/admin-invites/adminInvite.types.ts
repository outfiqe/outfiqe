export type AdminInviteRecord = {
  id: string;
  email: string;
  name: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  invitedById: string;
};

export type CreateAdminInviteInput = {
  email: string;
  name: string;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
};

export type AdminInviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

export type AdminInviteSummary = {
  id: string;
  email: string;
  name: string;
  status: AdminInviteStatus;
  isCoFounder: boolean;
  createdAt: Date;
  expiresAt: Date;
};
