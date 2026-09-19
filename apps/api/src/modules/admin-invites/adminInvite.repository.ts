import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type {
  AdminInviteRecord,
  AdminInviteWithRoleName,
  CreateAdminInviteInput,
} from "./adminInvite.types.js";

export const adminInviteRepository = {
  async create(input: CreateAdminInviteInput): Promise<AdminInviteRecord> {
    return prisma.adminInvite.create({ data: input });
  },

  async list(): Promise<AdminInviteWithRoleName[]> {
    const invites = await prisma.adminInvite.findMany({
      orderBy: { createdAt: "desc" },
      include: { role: { select: { name: true } } },
    });
    return invites.map(({ role, ...invite }) => ({ ...invite, roleName: role.name }));
  },

  async findPlatformCoFounderEmails(emails: string[]): Promise<Set<string>> {
    if (emails.length === 0) return new Set();
    const coFounderMemberships = await prisma.membership.findMany({
      where: {
        isPlatformSuperAdmin: true,
        status: "ACTIVE",
        organization: { isPlatformOrg: true },
        user: { email: { in: emails } },
      },
      select: { user: { select: { email: true } } },
    });
    return new Set(coFounderMemberships.map((membership) => membership.user.email));
  },

  async findByTokenHash(tokenHash: string): Promise<AdminInviteRecord | null> {
    return prisma.adminInvite.findUnique({ where: { tokenHash } });
  },

  async findPendingByEmail(email: string): Promise<AdminInviteRecord | null> {
    return prisma.adminInvite.findFirst({
      where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  async countPendingByRoleId(roleId: string): Promise<number> {
    return prisma.adminInvite.count({ where: { roleId, acceptedAt: null } });
  },

  async markAccepted(id: string, client: DbClient = prisma): Promise<void> {
    await client.adminInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
  },
};
