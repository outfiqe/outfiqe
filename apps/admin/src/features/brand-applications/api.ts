import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import {
  brandApplicationSchema,
  type BrandApplication,
  type BrandApplicationStatusValue,
} from "./schemas";

const listSchema = z.array(brandApplicationSchema);

export const brandApplicationsApi = {
  async list(status?: BrandApplicationStatusValue): Promise<BrandApplication[]> {
    const query = status ? `?status=${status}` : "";
    const res = await apiClient.get<unknown>(`/brand-applications${query}`);
    return listSchema.parse(res.data);
  },

  async approve(id: string): Promise<void> {
    await apiClient.post(`/brand-applications/${id}/approve`);
  },

  async reject(id: string, reason?: string): Promise<void> {
    await apiClient.post(`/brand-applications/${id}/reject`, reason ? { reason } : undefined);
  },
};
