import type { PlatformNavKey } from "@outfiqe/utils";

import { prisma, prismaRead } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type { CoFounderSummary } from "./platform-nav-access.types.js";

const activeCoFounderWhere = (platformOrganizationId: string) => ({
  organizationId: platformOrganizationId,
  isPlatformSuperAdmin: true,
  status: "ACTIVE" as const,
});

export const platformNavAccessRepository = {
  async findPlatformOrganizationId(): Promise<string | null> {
    const organization = await prismaRead.organization.findFirst({
      where: { isPlatformOrg: true },
      select: { id: true },
    });
    return organization?.id ?? null;
  },

  async findConfigHiddenNavKeys(): Promise<string[] | null> {
    const config = await prismaRead.platformNavAccess.findFirst({
      orderBy: { createdAt: "asc" },
      select: { hiddenNavKeys: true },
    });
    return config?.hiddenNavKeys ?? null;
  },

  async ensureConfigId(): Promise<string> {
    const existing = await prisma.platformNavAccess.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.platformNavAccess.create({
      data: { hiddenNavKeys: [] },
      select: { id: true },
    });
    return created.id;
  },

  async replaceHiddenNavKeys(
    hiddenNavKeys: PlatformNavKey[],
    updatedByMembershipId: string,
  ): Promise<string[]> {
    const configId = await this.ensureConfigId();
    const updated = await prisma.platformNavAccess.update({
      where: { id: configId },
      data: { hiddenNavKeys, updatedByMembershipId },
      select: { hiddenNavKeys: true },
    });
    return updated.hiddenNavKeys;
  },

  async findActiveCoFounderMembershipId(
    userId: string,
    platformOrganizationId: string,
  ): Promise<string | null> {
    const membership = await prismaRead.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: platformOrganizationId } },
      select: { id: true, status: true, isPlatformSuperAdmin: true },
    });
    if (!membership || membership.status !== "ACTIVE" || !membership.isPlatformSuperAdmin) {
      return null;
    }
    return membership.id;
  },

  async listPromotableMemberships(platformOrganizationId: string): Promise<CoFounderSummary[]> {
    const memberships = await prismaRead.membership.findMany({
      where: {
        organizationId: platformOrganizationId,
        isPlatformSuperAdmin: false,
        status: "ACTIVE",
      },
      select: { id: true, userId: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((membership) => ({
      membershipId: membership.id,
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
    }));
  },

  async listCoFounders(platformOrganizationId: string): Promise<CoFounderSummary[]> {
    const memberships = await prismaRead.membership.findMany({
      where: activeCoFounderWhere(platformOrganizationId),
      select: { id: true, userId: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((membership) => ({
      membershipId: membership.id,
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
    }));
  },

  async findPlatformMembership(membershipId: string, platformOrganizationId: string) {
    return prismaRead.membership.findFirst({
      where: { id: membershipId, organizationId: platformOrganizationId },
      select: {
        id: true,
        userId: true,
        status: true,
        isPlatformSuperAdmin: true,
        user: { select: { name: true, email: true } },
      },
    });
  },

  countActiveCoFounders(
    platformOrganizationId: string,
    client: DbClient = prisma,
  ): Promise<number> {
    return client.membership.count({ where: activeCoFounderWhere(platformOrganizationId) });
  },

  setCoFounderFlag(membershipId: string, isPlatformSuperAdmin: boolean, client: DbClient = prisma) {
    return client.membership.update({
      where: { id: membershipId },
      data: { isPlatformSuperAdmin },
    });
  },

  runInTransaction<T>(work: (client: DbClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(work);
  },
};
