import { apiClient } from "@/lib/apiClient";

import { type FeatureSwitch, featureSwitchListSchema, type FeatureSwitchSettings } from "./schemas";

export const FEATURE_SWITCHES_QUERY_KEY = ["platform-feature-switches"];

export const featureSwitchesApi = {
  async list(): Promise<FeatureSwitch[]> {
    const res = await apiClient.get<FeatureSwitch[]>("/platform/feature-flags");
    return featureSwitchListSchema.parse(res.data);
  },

  async update(key: string, settings: FeatureSwitchSettings): Promise<void> {
    await apiClient.put(`/platform/feature-flags/${key}`, settings);
  },
};
