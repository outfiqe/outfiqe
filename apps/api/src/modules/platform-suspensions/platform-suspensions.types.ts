import type { AccountStatus } from "#generated/prisma/enums.js";

export type SuspendUserInput = {
  targetUserId: string;
  actorUserId: string;
  reason: string;
  durationHours?: number;
};

export type BanUserInput = {
  targetUserId: string;
  actorUserId: string;
  reason: string;
};

export type LiftUserSuspensionInput = {
  targetUserId: string;
  actorUserId?: string;
};

export type AccountSuspensionState = {
  accountStatus: AccountStatus;
  suspendedAt: Date | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
  suspensionExpiresAt: Date | null;
};
