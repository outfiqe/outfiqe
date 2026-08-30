import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import type { CrmAuditLogRecord, RecordAuditInput } from "./crm-audit.types.js";

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
    params: { cursor?: string; limit: number },
  ): Promise<CrmAuditLogRecord[]> {
    const rows: AuditRow[] = await prisma.crmAuditLog.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: {
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
      },
    });

    const actorIds = [
      ...new Set(rows.map((row) => row.actorUserId).filter((id): id is string => id !== null)),
    ];
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
    const actorNameById = new Map(actors.map((actor) => [actor.id, actor.name]));

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      outcome: row.outcome,
      summary: row.summary,
      actorUserId: row.actorUserId,
      actorName: row.actorUserId ? (actorNameById.get(row.actorUserId) ?? null) : null,
      targetType: row.targetType,
      targetId: row.targetId,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    }));
  },
};
