import type { ImpersonationScope } from "./platform-impersonation.constants.js";

export type ImpersonationSessionRecord = {
  id: string;
  organizationId: string;
  impersonatorId: string;
  targetUserId: string;
  scope: ImpersonationScope;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  revokedById: string | null;
};

export type ImpersonationSessionSummary = ImpersonationSessionRecord & {
  impersonatorName: string | null;
  targetUserName: string | null;
  organizationName: string | null;
  active: boolean;
};

export type StartImpersonationInput = {
  organizationId: string;
  targetUserId: string;
  reason: string;
  scope: ImpersonationScope;
  impersonatorId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type ImpersonationActorClaim = {
  sub: string;
  via: "impersonation";
  sid: string;
  scope: ImpersonationScope;
};

export type StartImpersonationResult = {
  token: string;
  expiresAt: Date;
  session: ImpersonationSessionSummary;
};

export type ImpersonationCandidate = {
  userId: string;
  name: string;
  email: string;
  roleName: string;
};

export type TenantImpersonationLogEntry = {
  id: string;
  kind: "started" | "ended";
  staffName: string | null;
  at: Date;
  reason: string | null;
  scope: string | null;
};
