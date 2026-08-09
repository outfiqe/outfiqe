import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import { creatorProfileSchema, type CreatorProfile, type CreatorStatusValue } from "./schemas";

const listSchema = z.array(creatorProfileSchema);

export const creatorsApi = {
  async list(status: CreatorStatusValue): Promise<CreatorProfile[]> {
    const res = await apiClient.get<unknown>(`/creators?status=${status}`);
    return listSchema.parse(res.data);
  },

  async approve(userId: string): Promise<void> {
    await apiClient.post(`/creators/${userId}/approve`);
  },

  async reject(userId: string): Promise<void> {
    await apiClient.post(`/creators/${userId}/reject`);
  },
};
