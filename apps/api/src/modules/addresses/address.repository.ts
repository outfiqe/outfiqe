import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type {
  CreateSavedAddressInput,
  SavedAddressRecord,
  UpdateSavedAddressFields,
} from "./address.types.js";

export const addressRepository = {
  async countForUser(userId: string, client: DbClient = prisma): Promise<number> {
    return client.savedAddress.count({ where: { userId } });
  },

  async listForUser(userId: string): Promise<SavedAddressRecord[]> {
    return prisma.savedAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  },

  async findOwned(
    userId: string,
    id: string,
    client: DbClient = prisma,
  ): Promise<SavedAddressRecord | null> {
    return client.savedAddress.findFirst({ where: { id, userId } });
  },

  async clearDefault(userId: string, client: DbClient): Promise<void> {
    await client.savedAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  },

  async create(
    input: CreateSavedAddressInput,
    client: DbClient = prisma,
  ): Promise<SavedAddressRecord> {
    return client.savedAddress.create({ data: input });
  },

  async update(
    id: string,
    fields: UpdateSavedAddressFields & { isDefault?: boolean },
    client: DbClient = prisma,
  ): Promise<SavedAddressRecord> {
    return client.savedAddress.update({ where: { id }, data: fields });
  },

  async delete(id: string, client: DbClient): Promise<void> {
    await client.savedAddress.delete({ where: { id } });
  },

  async findMostRecentForUser(
    userId: string,
    client: DbClient,
  ): Promise<SavedAddressRecord | null> {
    return client.savedAddress.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  },
};
