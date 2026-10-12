import { prisma } from "#db/prisma.js";
import { runWithDeadlockRetry } from "#lib/prisma.utils.js";
import type { DbClient } from "#types/db.types.js";

import type {
  CreateOrganizationInviteInput,
  MembershipRecord,
  OrganizationInviteRecord,
} from "../crm-access.types.js";

export const crmInviteRepository = {
  async createInvite(
    input: CreateOrganizationInviteInput,
    client: DbClient = prisma,
  ): Promise<OrganizationInviteRecord> {
    return client.organizationInvite.create({ data: input });
  },

  async findInviteByTokenHash(tokenHash: string): Promise<OrganizationInviteRecord | null> {
    return prisma.organizationInvite.findUnique({ where: { tokenHash } });
  },

  async findPendingInviteByEmail(
    organizationId: string,
    email: string,
    client: DbClient = prisma,
  ): Promise<OrganizationInviteRecord | null> {
    return client.organizationInvite.findFirst({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async countPendingInvites(organizationId: string, client: DbClient = prisma): Promise<number> {
    return client.organizationInvite.count({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async acquireOrganizationInviteLock(client: DbClient, organizationId: string): Promise<void> {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
  },

  async listInvites(
    organizationId: string,
  ): Promise<(OrganizationInviteRecord & { roleName: string })[]> {
    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return invites.map((invite) => ({ ...invite, roleName: invite.role.name }));
  },

  async revokeInvite(organizationId: string, inviteId: string): Promise<void> {
    await prisma.organizationInvite.update({
      where: { id: inviteId, organizationId },
      data: { revokedAt: new Date() },
    });
  },

  async acceptInviteWithClient(
    invite: OrganizationInviteRecord,
    acceptingUserId: string,
    client: DbClient = prisma,
  ): Promise<MembershipRecord> {
    const membership = await client.membership.create({
      data: {
        userId: acceptingUserId,
        organizationId: invite.organizationId,
        roleId: invite.roleId,
        status: "ACTIVE",
      },
    });

    await client.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return membership;
  },

  async acceptInvite(
    invite: OrganizationInviteRecord,
    acceptingUserId: string,
  ): Promise<MembershipRecord> {
    return runWithDeadlockRetry(() =>
      prisma.$transaction((tx) =>
        crmInviteRepository.acceptInviteWithClient(invite, acceptingUserId, tx),
      ),
    );
  },
};
