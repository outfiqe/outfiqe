import { prisma, prismaRead } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import type {
  PlatformAuditListFilters,
  PlatformAuditLogRecord,
  RecordPlatformAuditInput,
} from "./platform-audit.types.js";

const listRowSelect = {
  id: true,
  actorUserId: true,
  onBehalfOfUserId: true,
  organizationId: true,
  impersonationSessionId: true,
  action: true,
  method: true,
  path: true,
  statusCode: true,
  targetType: true,
  targetId: true,
  summary: true,
  metadata: true,
  ipAddress: true,
  createdAt: true,
} as const;

type ListRow = Prisma.PlatformAuditLogGetPayload<{ select: typeof listRowSelect }>;

export const platformAuditRepository = {
  async insert(input: RecordPlatformAuditInput): Promise<void> {
    await prisma.platformAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        summary: input.summary,
        organizationId: input.organizationId ?? null,
        onBehalfOfUserId: input.onBehalfOfUserId ?? null,
        impersonationSessionId: input.impersonationSessionId ?? null,
        method: input.method ?? null,
        path: input.path ?? null,
        statusCode: input.statusCode ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async list(filters: PlatformAuditListFilters): Promise<PlatformAuditLogRecord[]> {
    const where: Prisma.PlatformAuditLogWhereInput = {};
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.action) where.action = filters.action;

    const rows: ListRow[] = await prismaRead.platformAuditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      select: listRowSelect,
    });

    const userIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.actorUserId, row.onBehalfOfUserId])
          .filter((id): id is string => id !== null),
      ),
    ];
    const users = userIds.length
      ? await prismaRead.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(users.map((user) => [user.id, user.name]));

    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      actorName: nameById.get(row.actorUserId) ?? null,
      onBehalfOfUserId: row.onBehalfOfUserId,
      onBehalfOfName: row.onBehalfOfUserId ? (nameById.get(row.onBehalfOfUserId) ?? null) : null,
      organizationId: row.organizationId,
      impersonationSessionId: row.impersonationSessionId,
      action: row.action,
      method: row.method,
      path: row.path,
      statusCode: row.statusCode,
      targetType: row.targetType,
      targetId: row.targetId,
      summary: row.summary,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    }));
  },
};
