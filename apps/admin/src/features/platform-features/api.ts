import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type FeatureDefinition,
  featureDefinitionSchema,
  type ResolvedFeature,
  resolvedFeatureSchema,
} from "./schemas";

const registrySchema = z.array(featureDefinitionSchema);
const resolvedListSchema = z.array(resolvedFeatureSchema);

export const platformFeaturesApi = {
  async getRegistry(): Promise<FeatureDefinition[]> {
    const res = await apiClient.get<FeatureDefinition[]>("/platform/features/registry");
    return registrySchema.parse(res.data);
  },

  async getTenantFeatures(orgId: string): Promise<ResolvedFeature[]> {
    const res = await apiClient.get<ResolvedFeature[]>(`/platform/features/tenants/${orgId}`);
    return resolvedListSchema.parse(res.data);
  },

  async setOverride(orgId: string, key: string, enabled: boolean, note?: string): Promise<void> {
    await apiClient.put(`/platform/features/tenants/${orgId}/${key}`, {
      enabled,
      ...(note ? { note } : {}),
    });
  },

  async clearOverride(orgId: string, key: string): Promise<void> {
    await apiClient.del(`/platform/features/tenants/${orgId}/${key}`);
  },
};
