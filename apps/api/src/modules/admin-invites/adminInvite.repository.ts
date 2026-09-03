import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type { AdminInviteRecord, CreateAdminInviteInput } from "./adminInvite.types.js";

export const adminInviteRepository = {
  async create(input: CreateAdminInviteInput): Promise<AdminInviteRecord> {
    return prisma.adminInvite.create({ data: input });
  },

  async list(): Promise<AdminInviteRecord[]> {
    return prisma.adminInvite.findMany({ orderBy: { createdAt: "desc" } });
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

  async markAccepted(id: string, client: DbClient = prisma): Promise<void> {
    await client.adminInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
  },
};
