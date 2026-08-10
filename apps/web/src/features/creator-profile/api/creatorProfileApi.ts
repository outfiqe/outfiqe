import { apiClient } from "@/shared/lib/apiClient";
import { feedPageSchema, type FeedPage } from "@/features/explore/api/exploreFeedSchemas";
import { creatorProfileSchema, type CreatorProfile } from "./creatorProfileSchemas";

export const creatorProfileApi = {
  async get(handle: string): Promise<CreatorProfile> {
    const res = await apiClient.get<CreatorProfile>(`/creators/by-handle/${handle}`);
    return creatorProfileSchema.parse(res.data);
  },

  async listLooks(handle: string, cursor?: string): Promise<FeedPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<FeedPage>(
      `/creators/by-handle/${handle}/looks?${params.toString()}`,
    );
    return feedPageSchema.parse(res.data);
  },
};
