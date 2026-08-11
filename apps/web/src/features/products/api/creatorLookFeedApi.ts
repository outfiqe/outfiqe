import { apiClient } from "@/shared/lib/apiClient";
import { creatorLookProductPageSchema, type CreatorLookProductPage } from "./productSchemas";

type ListCreatorLooksInput = {
  cursor?: string;
};

export const creatorLookFeedApi = {
  async list({ cursor }: ListCreatorLooksInput = {}): Promise<CreatorLookProductPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<CreatorLookProductPage>(`/creator-looks?${params.toString()}`);
    return creatorLookProductPageSchema.parse(res.data);
  },
};
