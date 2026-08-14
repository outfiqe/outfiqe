import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { creatorProfileSchema, type CreatorStatusValue } from "./schemas";

const creatorPageSchema = z.object({
  creators: z.array(creatorProfileSchema),
  nextCursor: z.string().nullable(),
});
export type CreatorPage = z.infer<typeof creatorPageSchema>;

export const creatorsApi = {
  async list(status: CreatorStatusValue, cursor?: string): Promise<CreatorPage> {
    const params = new URLSearchParams({ status });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<CreatorPage>(`/creators?${params.toString()}`);
    return creatorPageSchema.parse(res.data);
  },

  async approve(userId: string): Promise<void> {
    await apiClient.post(`/creators/${userId}/approve`);
  },

  async reject(userId: string): Promise<void> {
    await apiClient.post(`/creators/${userId}/reject`);
  },
};
