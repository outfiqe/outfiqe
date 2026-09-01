export type RecordPlatformAuditInput = {
  actorUserId: string;
  action: string;
  summary: string;
  organizationId?: string | null;
  onBehalfOfUserId?: string | null;
  impersonationSessionId?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export type PlatformAuditListFilters = {
  organizationId?: string;
  actorUserId?: string;
  action?: string;
  cursor?: string;
  limit: number;
};

export type PlatformAuditLogRecord = {
  id: string;
  actorUserId: string;
  actorName: string | null;
  onBehalfOfUserId: string | null;
  onBehalfOfName: string | null;
  organizationId: string | null;
  impersonationSessionId: string | null;
  action: string;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
};

export type PlatformAuditLogPage = {
  entries: PlatformAuditLogRecord[];
  nextCursor: string | null;
};
