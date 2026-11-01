import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import { AUDIT_ACTION_GROUPS } from "./crm-audit.constants.js";
import type {
  AuditFilterOptions,
  AuditLogFilters,
  CrmAuditLogRecord,
  RecordAuditInput,
} from "./crm-audit.types.js";

type AuditRow = {
  id: string;
  action: CrmAuditLogRecord["action"];
  outcome: CrmAuditLogRecord["outcome"];
  summary: string;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
};

const SUCCESS_OUTCOME: CrmAuditLogRecord["outcome"] = "SUCCESS";

const AUDIT_ROW_SELECT = {
  id: true,
  action: true,
  outcome: true,
  summary: true,
  actorUserId: true,
  targetType: true,
  targetId: true,
  metadata: true,
  ipAddress: true,
  createdAt: true,
} as const;

const toAuditWhere = (
  organizationId: string,
  { action, group, actorUserId, from, to }: AuditLogFilters,
): Prisma.CrmAuditLogWhereInput => ({
  organizationId,
  ...(action ? { action } : {}),
  ...(group ? { action: { in: [...AUDIT_ACTION_GROUPS[group]] } } : {}),
  ...(actorUserId ? { actorUserId } : {}),
  ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
});

const withActorDetails = async (
  organizationId: string,
  rows: AuditRow[],
): Promise<CrmAuditLogRecord[]> => {
  const actorIds = [
    ...new Set(rows.map((row) => row.actorUserId).filter((id): id is string => id !== null)),
  ];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          crmMemberships: {
            where: { organizationId, status: "ACTIVE" },
            select: { id: true, createdAt: true, role: { select: { name: true } } },
          },
        },
      })
    : [];
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  return rows.map((row) => {
    const actor = row.actorUserId ? actorById.get(row.actorUserId) : undefined;
    const [membership] = actor?.crmMemberships ?? [];
    return {
      id: row.id,
      action: row.action,
      outcome: row.outcome,
      summary: row.summary,
      actorUserId: row.actorUserId,
      actorName: actor?.name ?? null,
      actorAvatarUrl: actor?.avatarUrl ?? null,
      actorMember: membership
        ? {
            membershipId: membership.id,
            roleName: membership.role.name,
            joinedAt: membership.createdAt,
          }
        : null,
      targetType: row.targetType,
      targetId: row.targetId,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    };
  });
};

export const crmAuditRepository = {
  async insert(input: RecordAuditInput): Promise<void> {
    await prisma.crmAuditLog.create({
      data: {
        organizationId: input.organizationId,
        action: input.action,
        outcome: input.outcome ?? SUCCESS_OUTCOME,
        summary: input.summary,
        actorUserId: input.actor?.actorUserId ?? null,
        actorMembershipId: input.actor?.actorMembershipId ?? null,
        ipAddress: input.actor?.ipAddress ?? null,
        targetType: input.target?.type ?? null,
        targetId: input.target?.id ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async list(
    organizationId: string,
    params: AuditLogFilters & { cursor?: string; limit: number },
  ): Promise<CrmAuditLogRecord[]> {
    const rows: AuditRow[] = await prisma.crmAuditLog.findMany({
      where: toAuditWhere(organizationId, params),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: AUDIT_ROW_SELECT,
    });
    return withActorDetails(organizationId, rows);
  },

  async listForExport(
    organizationId: string,
    filters: AuditLogFilters,
    rowLimit: number,
  ): Promise<CrmAuditLogRecord[]> {
    const rows: AuditRow[] = await prisma.crmAuditLog.findMany({
      where: toAuditWhere(organizationId, filters),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: rowLimit,
      select: AUDIT_ROW_SELECT,
    });
    return withActorDetails(organizationId, rows);
  },

  async listFilterOptions(organizationId: string): Promise<AuditFilterOptions> {
    const [actionRows, actorRows] = await Promise.all([
      prisma.crmAuditLog.findMany({
        where: { organizationId },
        distinct: ["action"],
        select: { action: true },
      }),
      prisma.crmAuditLog.findMany({
        where: { organizationId, actorUserId: { not: null } },
        distinct: ["actorUserId"],
        select: { actorUserId: true },
      }),
    ]);
    const actors = await prisma.user.findMany({
      where: {
        id: { in: actorRows.flatMap(({ actorUserId }) => (actorUserId ? [actorUserId] : [])) },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return { actions: actionRows.map(({ action }) => action), actors };
  },
};
