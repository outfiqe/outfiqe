import type { CrmAuditAction, CrmAuditOutcome } from "#generated/prisma/enums.js";

import type { AuditActionGroup } from "./crm-audit.constants.js";

export type AuditActor = {
  actorUserId: string | null;
  actorMembershipId: string | null;
  ipAddress: string | null;
};

export type AuditTarget = {
  type: string;
  id: string | null;
};

export type RecordAuditInput = {
  organizationId: string;
  action: CrmAuditAction;
  summary: string;
  actor?: AuditActor;
  outcome?: CrmAuditOutcome;
  target?: AuditTarget;
  metadata?: Record<string, unknown>;
};

export type AuditActorMember = {
  membershipId: string;
  roleName: string;
  joinedAt: Date;
};

export type CrmAuditLogRecord = {
  id: string;
  action: CrmAuditAction;
  outcome: CrmAuditOutcome;
  summary: string;
  actorUserId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  actorMember: AuditActorMember | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
};

export type CrmAuditLogPage = {
  entries: CrmAuditLogRecord[];
  nextCursor: string | null;
};

export type AuditLogFilters = {
  action?: CrmAuditLogRecord["action"];
  group?: AuditActionGroup;
  actorUserId?: string;
  from?: Date;
  to?: Date;
};

export type AuditFilterOptions = {
  actions: CrmAuditLogRecord["action"][];
  actors: { id: string; name: string }[];
};
