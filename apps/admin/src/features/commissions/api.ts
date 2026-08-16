import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  adminCommissionSchema,
  type CommissionStatusValue,
  type CommissionTier,
  commissionTierSchema,
} from "./schemas";

const tierListSchema = z.array(commissionTierSchema);

const commissionPageSchema = z.object({
  items: z.array(adminCommissionSchema),
  nextCursor: z.string().nullable(),
});
export type CommissionPage = z.infer<typeof commissionPageSchema>;

export type CreateTierInput = {
  minPrice: number;
  maxPrice?: number;
  amount: number;
  sortOrder?: number;
};
export type UpdateTierInput = Partial<CreateTierInput>;

export const commissionsApi = {
  async listTiers(): Promise<CommissionTier[]> {
    const res = await apiClient.get<CommissionTier[]>("/commissions/tiers");
    return tierListSchema.parse(res.data);
  },

  async createTier(input: CreateTierInput): Promise<CommissionTier> {
    const res = await apiClient.post<CommissionTier>("/commissions/tiers", input);
    return commissionTierSchema.parse(res.data);
  },

  async updateTier(id: string, input: UpdateTierInput): Promise<CommissionTier> {
    const res = await apiClient.patch<CommissionTier>(`/commissions/tiers/${id}`, input);
    return commissionTierSchema.parse(res.data);
  },

  async deleteTier(id: string): Promise<void> {
    await apiClient.del(`/commissions/tiers/${id}`);
  },

  async list(status?: CommissionStatusValue, cursor?: string): Promise<CommissionPage> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);

    const query = params.toString();
    const res = await apiClient.get<CommissionPage>(`/commissions${query ? `?${query}` : ""}`);
    return commissionPageSchema.parse(res.data);
  },

  async approve(id: string): Promise<void> {
    await apiClient.post(`/commissions/${id}/approve`);
  },

  async void(id: string, reason: string): Promise<void> {
    await apiClient.post(`/commissions/${id}/void`, { reason });
  },

  async markPaid(id: string): Promise<void> {
    await apiClient.post(`/commissions/${id}/mark-paid`);
  },
};
