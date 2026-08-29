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

  async findByTokenHash(tokenHash: string): Promise<AdminInviteRecord | null> {
    return prisma.adminInvite.findUnique({ where: { tokenHash } });
  },

  async markAccepted(id: string, client: DbClient = prisma): Promise<void> {
    await client.adminInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
  },
};
