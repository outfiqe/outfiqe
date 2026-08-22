import { apiClient } from "@/shared/lib/apiClient";

import {
  type ActiveXpMultiplier,
  activeXpMultiplierSchema,
  type XpProgress,
  xpProgressSchema,
  type XpTransactionPage,
  xpTransactionPageSchema,
} from "./xpSchemas";

export const xpApi = {
  async getMyProgress(): Promise<XpProgress | null> {
    const res = await apiClient.get<XpProgress | null>("/xp/me");
    return xpProgressSchema.nullable().parse(res.data);
  },

  async listMyTransactions(cursor?: string): Promise<XpTransactionPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<XpTransactionPage>(`/xp/me/transactions${params}`);
    return xpTransactionPageSchema.parse(res.data);
  },

  async getActiveMultiplier(): Promise<ActiveXpMultiplier> {
    const res = await apiClient.get<ActiveXpMultiplier>("/xp/multiplier/active");
    return activeXpMultiplierSchema.parse(res.data);
  },
};
