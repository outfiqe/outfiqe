import { apiClient } from "@/shared/lib/apiClient";

import { type NepalBank, nepalBankListSchema } from "./nepalBankSchemas";

export const nepalBankApi = {
  async list(): Promise<NepalBank[]> {
    const res = await apiClient.get<NepalBank[]>("/banks");
    return nepalBankListSchema.parse(res.data);
  },
};
