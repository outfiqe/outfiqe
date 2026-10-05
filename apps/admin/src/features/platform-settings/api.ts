import { apiClient } from "@/lib/apiClient";

import { type PlatformSetting, platformSettingListSchema } from "./schemas";

export const PLATFORM_SETTINGS_QUERY_KEY = ["platform-settings"];

export const platformSettingsApi = {
  async list(): Promise<PlatformSetting[]> {
    const res = await apiClient.get<PlatformSetting[]>("/platform/settings");
    return platformSettingListSchema.parse(res.data);
  },

  async update(key: string, value: number): Promise<void> {
    await apiClient.put(`/platform/settings/${key}`, { value });
  },

  async reset(key: string): Promise<void> {
    await apiClient.del(`/platform/settings/${key}`);
  },
};
