import { apiClient } from "@/lib/apiClient";

import { type OwnerTypeValue, type WithdrawPolicy, withdrawPolicySchema } from "./schemas";

export type UpdateWithdrawPolicyInput = {
  ownerType: OwnerTypeValue;
  minAmount: number;
  maxAmount: number;
  windowType: WithdrawPolicy["windowType"];
  windowValue: number;
  maxAttemptsPerWindow: number;
  cooldownAfterRejectionDays: number;
  processingNoteText: string;
};

export const withdrawPolicyApi = {
  async get(ownerType: OwnerTypeValue): Promise<WithdrawPolicy> {
    const res = await apiClient.get<WithdrawPolicy>(`/withdraw/policy?ownerType=${ownerType}`);
    return withdrawPolicySchema.parse(res.data);
  },

  async update(input: UpdateWithdrawPolicyInput): Promise<WithdrawPolicy> {
    const res = await apiClient.put<WithdrawPolicy>("/withdraw/admin/policy", input);
    return withdrawPolicySchema.parse(res.data);
  },
};
