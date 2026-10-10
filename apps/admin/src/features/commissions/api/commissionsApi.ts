import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  adminCommissionSchema,
  type CommissionScopeValue,
  type CommissionStatusValue,
  type CommissionTier,
  commissionTierSchema,
  type TierChangePage,
  tierChangePageSchema,
  type TierPriceTest,
  tierPriceTestSchema,
} from "./commissionsSchemas";

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

const scopeQuery = (scope: CommissionScopeValue): string => `scope=${scope}`;

export const commissionsApi = {
  async listTiers(scope: CommissionScopeValue): Promise<CommissionTier[]> {
    const res = await apiClient.get<CommissionTier[]>(`/commissions/tiers?${scopeQuery(scope)}`);
    return tierListSchema.parse(res.data);
  },

  async createTier(scope: CommissionScopeValue, input: CreateTierInput): Promise<CommissionTier> {
    const res = await apiClient.post<CommissionTier>(
      `/commissions/tiers?${scopeQuery(scope)}`,
      input,
    );
    return commissionTierSchema.parse(res.data);
  },

  async updateTier(
    scope: CommissionScopeValue,
    id: string,
    input: UpdateTierInput,
  ): Promise<CommissionTier> {
    const res = await apiClient.patch<CommissionTier>(
      `/commissions/tiers/${id}?${scopeQuery(scope)}`,
      input,
    );
    return commissionTierSchema.parse(res.data);
  },

  async deleteTier(scope: CommissionScopeValue, id: string): Promise<void> {
    await apiClient.del(`/commissions/tiers/${id}?${scopeQuery(scope)}`);
  },

  async testTierPrice(scope: CommissionScopeValue, price: number): Promise<TierPriceTest> {
    const res = await apiClient.get<TierPriceTest>(
      `/commissions/tiers/price-test?${scopeQuery(scope)}&price=${price}`,
    );
    return tierPriceTestSchema.parse(res.data);
  },

  async listTierHistory(scope: CommissionScopeValue, cursor?: string): Promise<TierChangePage> {
    const params = new URLSearchParams({ scope });
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get<TierChangePage>(`/commissions/tiers/history?${params}`);
    return tierChangePageSchema.parse(res.data);
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
