import { apiClient } from "@/lib/apiClient";

import {
  type CancellationDecision,
  cancellationDecisionSchema,
  type CancellationRequestPage,
  cancellationRequestPageSchema,
} from "./cancellationRequestsSchemas";

const CANCELLATION_REQUESTS_PATH = "/orders/admin/cancellation-requests";

export const cancellationRequestsApi = {
  async list(cursor?: string): Promise<CancellationRequestPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get(`${CANCELLATION_REQUESTS_PATH}?${params.toString()}`);
    return cancellationRequestPageSchema.parse(res.data);
  },

  async approve(fulfilmentGroupId: string): Promise<CancellationDecision> {
    const res = await apiClient.post(`${CANCELLATION_REQUESTS_PATH}/${fulfilmentGroupId}/approve`);
    return cancellationDecisionSchema.parse(res.data);
  },

  async reject(fulfilmentGroupId: string, note: string): Promise<CancellationDecision> {
    const res = await apiClient.post(`${CANCELLATION_REQUESTS_PATH}/${fulfilmentGroupId}/reject`, {
      note,
    });
    return cancellationDecisionSchema.parse(res.data);
  },
};
