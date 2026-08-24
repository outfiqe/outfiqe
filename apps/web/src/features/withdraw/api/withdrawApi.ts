import { apiClient } from "@/shared/lib/apiClient";

import {
  type CreateWithdrawRequestInput,
  type OwnerTypeValue,
  type WithdrawEligibility,
  withdrawEligibilitySchema,
  type WithdrawPolicy,
  withdrawPolicySchema,
  type WithdrawRequest,
  type WithdrawRequestPage,
  withdrawRequestPageSchema,
  withdrawRequestSchema,
} from "./withdrawSchemas";

export const withdrawApi = {
  async getPolicy(ownerType: OwnerTypeValue): Promise<WithdrawPolicy> {
    const res = await apiClient.get<WithdrawPolicy>(`/withdraw/policy?ownerType=${ownerType}`);
    return withdrawPolicySchema.parse(res.data);
  },

  async getEligibility(ownerType: OwnerTypeValue): Promise<WithdrawEligibility> {
    const res = await apiClient.get<WithdrawEligibility>(
      `/withdraw/eligibility?ownerType=${ownerType}`,
    );
    return withdrawEligibilitySchema.parse(res.data);
  },

  async createRequest(
    ownerType: OwnerTypeValue,
    input: CreateWithdrawRequestInput,
  ): Promise<WithdrawRequest> {
    const res = await apiClient.post<WithdrawRequest>("/withdraw/requests", {
      ownerType,
      ...input,
    });
    return withdrawRequestSchema.parse(res.data);
  },

  async listMine(ownerType: OwnerTypeValue, cursor?: string): Promise<WithdrawRequestPage> {
    const params = new URLSearchParams({ ownerType });
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get<WithdrawRequestPage>(`/withdraw/requests?${params}`);
    return withdrawRequestPageSchema.parse(res.data);
  },
};
