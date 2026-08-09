import { apiClient } from "@/shared/lib/apiClient";
import {
  creatorLookProductPageSchema,
  type CreatorLookProductPage,
} from "@/features/products/api/productSchemas";
import { creatorProfileSchema, type CreatorProfile } from "./creatorProfileSchemas";

export const creatorProfileApi = {
  async get(handle: string): Promise<CreatorProfile> {
    const res = await apiClient.get<CreatorProfile>(`/creators/by-handle/${handle}`);
    return creatorProfileSchema.parse(res.data);
  },

  async listLooks(handle: string, cursor?: string): Promise<CreatorLookProductPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<CreatorLookProductPage>(
      `/creators/by-handle/${handle}/looks?${params.toString()}`,
    );
    return creatorLookProductPageSchema.parse(res.data);
  },
};
