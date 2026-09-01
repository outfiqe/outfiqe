import { prisma } from "#db/prisma.js";

import type { ImpersonationScope } from "./platform-impersonation.constants.js";
import type {
  ImpersonationSessionRecord,
  ImpersonationSessionSummary,
  StartImpersonationInput,
} from "./platform-impersonation.types.js";

const baseSelect = {
  id: true,
  organizationId: true,
  impersonatorId: true,
  targetUserId: true,
  scope: true,
  reason: true,
  createdAt: true,
  expiresAt: true,
  lastSeenAt: true,
  revokedAt: true,
  revokedById: true,
} as const;

type BaseRow = {
  id: string;
  organizationId: string;
  impersonatorId: string;
  targetUserId: string;
  scope: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  revokedById: string | null;
};

const toRecord = (row: BaseRow): ImpersonationSessionRecord => ({
  ...row,
  scope: row.scope as ImpersonationScope,
});

const isActive = (row: { revokedAt: Date | null; expiresAt: Date }): boolean =>
  row.revokedAt === null && row.expiresAt > new Date();

export const platformImpersonationRepository = {
  async findActiveMembership(
    userId: string,
    organizationId: string,
  ): Promise<{ id: string } | null> {
    return prisma.membership.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
      select: { id: true },
    });
  },

  async isPlatformStaff(userId: string): Promise<boolean> {
    const platformOrg = await prisma.organization.findFirst({
      where: { isPlatformOrg: true },
      select: { id: true },
    });
    if (!platformOrg) return false;
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: platformOrg.id },
      select: { id: true },
    });
    return membership !== null;
  },

  async create(
    input: StartImpersonationInput,
    expiresAt: Date,
  ): Promise<ImpersonationSessionRecord> {
    const row = await prisma.impersonationSession.create({
      data: {
        organizationId: input.organizationId,
        impersonatorId: input.impersonatorId,
        targetUserId: input.targetUserId,
        scope: input.scope,
        reason: input.reason,
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      select: baseSelect,
    });
    return toRecord(row);
  },

  async findById(id: string): Promise<ImpersonationSessionRecord | null> {
    const row = await prisma.impersonationSession.findUnique({ where: { id }, select: baseSelect });
    return row ? toRecord(row) : null;
  },

  async findActiveForImpersonator(
    impersonatorId: string,
    organizationId: string,
  ): Promise<ImpersonationSessionRecord | null> {
    const row = await prisma.impersonationSession.findFirst({
      where: {
        impersonatorId,
        organizationId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: baseSelect,
    });
    return row ? toRecord(row) : null;
  },

  async revoke(id: string, revokedById: string): Promise<void> {
    await prisma.impersonationSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), revokedById },
    });
  },

  async touchLastSeen(id: string): Promise<void> {
    await prisma.impersonationSession.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  },

  async reapExpired(): Promise<number> {
    const result = await prisma.impersonationSession.updateMany({
      where: { revokedAt: null, expiresAt: { lte: new Date() } },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  async listActive(): Promise<ImpersonationSessionSummary[]> {
    return this.hydrate(
      await prisma.impersonationSession.findMany({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: baseSelect,
      }),
    );
  },

  async listHistory(filters: {
    organizationId?: string;
    impersonatorId?: string;
    limit: number;
  }): Promise<ImpersonationSessionSummary[]> {
    return this.hydrate(
      await prisma.impersonationSession.findMany({
        where: {
          ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
          ...(filters.impersonatorId ? { impersonatorId: filters.impersonatorId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit,
        select: baseSelect,
      }),
    );
  },

  async hydrate(rows: BaseRow[]): Promise<ImpersonationSessionSummary[]> {
    const userIds = [...new Set(rows.flatMap((row) => [row.impersonatorId, row.targetUserId]))];
    const orgIds = [...new Set(rows.map((row) => row.organizationId))];
    const [users, organizations] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [],
      orgIds.length
        ? prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);
    const userName = new Map(users.map((user) => [user.id, user.name]));
    const orgName = new Map(organizations.map((org) => [org.id, org.name]));

    return rows.map((row) => ({
      ...toRecord(row),
      impersonatorName: userName.get(row.impersonatorId) ?? null,
      targetUserName: userName.get(row.targetUserId) ?? null,
      organizationName: orgName.get(row.organizationId) ?? null,
      active: isActive(row),
    }));
  },
};
