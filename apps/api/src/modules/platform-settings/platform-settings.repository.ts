import type { DbClient } from "#types/db.types.js";

import type { StoredPlatformSetting } from "./platform-settings.types.js";

export const platformSettingsRepository = {
  async listStored(client: DbClient): Promise<StoredPlatformSetting[]> {
    return client.appSetting.findMany({
      select: { key: true, value: true, updatedAt: true },
      orderBy: { key: "asc" },
    });
  },

  async upsert(client: DbClient, key: string, value: number, updatedById: string): Promise<void> {
    await client.appSetting.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedById },
    });
  },

  async remove(client: DbClient, key: string): Promise<void> {
    await client.appSetting.deleteMany({ where: { key } });
  },
};
