import { prisma } from "#db/prisma.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";

import type { ImpersonationScope } from "./platform-impersonation.constants.js";
import type {
  ImpersonationCandidate,
  ImpersonationSessionRecord,
  ImpersonationSessionSummary,
  StartImpersonationInput,
  TenantImpersonationLogEntry,
} from "./platform-impersonation.types.js";

const IMPERSONATION_AUDIT_ACTION_PREFIX = "impersonation.";

const readMetadataString = (metadata: unknown, key: string): string | null => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

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

  async listImpersonationCandidates(organizationId: string): Promise<ImpersonationCandidate[]> {
    const platformOrg = await prisma.organization.findFirst({
      where: { isPlatformOrg: true },
      select: { id: true },
    });
    const platformMemberships = platformOrg
      ? await prisma.membership.findMany({
          where: { organizationId: platformOrg.id },
          select: { userId: true },
        })
      : [];
    const platformStaffIds = new Set(platformMemberships.map((member) => member.userId));

    const memberships = await prisma.membership.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
        role: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return memberships
      .filter((member) => !platformStaffIds.has(member.userId))
      .map((member) => ({
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        roleName: member.role.name,
      }));
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

  async findActiveForOrganization(
    organizationId: string,
  ): Promise<ImpersonationSessionRecord | null> {
    const row = await prisma.impersonationSession.findFirst({
      where: { organizationId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: baseSelect,
    });
    return row ? toRecord(row) : null;
  },

  async listOrganizationLog(
    organizationId: string,
    limit: number,
  ): Promise<TenantImpersonationLogEntry[]> {
    const rows = await prisma.platformAuditLog.findMany({
      where: { organizationId, action: { startsWith: IMPERSONATION_AUDIT_ACTION_PREFIX } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, action: true, actorUserId: true, createdAt: true, metadata: true },
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
      kind: row.action === PLATFORM_AUDIT_ACTION.IMPERSONATION_START ? "started" : "ended",
      staffName: row.actorUserId ? (actorNameById.get(row.actorUserId) ?? null) : null,
      at: row.createdAt,
      reason: readMetadataString(row.metadata, "reason"),
      scope: readMetadataString(row.metadata, "scope"),
    }));
  },

  async listActiveForOrganization(organizationId: string): Promise<ImpersonationSessionRecord[]> {
    const rows = await prisma.impersonationSession.findMany({
      where: { organizationId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: baseSelect,
    });
    return rows.map(toRecord);
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
