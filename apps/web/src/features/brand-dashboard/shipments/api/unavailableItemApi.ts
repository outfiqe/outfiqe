import { apiClient } from "@/shared/lib/apiClient";

import {
  type ReportUnavailableItemsBody,
  type UnavailableItemReport,
  unavailableItemReportsResponseSchema,
} from "./unavailableItemSchemas";

const unavailableItemsPath = (groupId: string) =>
  `/orders/brand/fulfilment-groups/${groupId}/unavailable-items`;

export const unavailableItemApi = {
  async list(groupId: string): Promise<UnavailableItemReport[]> {
    const res = await apiClient.get(unavailableItemsPath(groupId));
    return unavailableItemReportsResponseSchema.parse(res.data).requests;
  },

  async report(
    groupId: string,
    body: ReportUnavailableItemsBody,
  ): Promise<UnavailableItemReport[]> {
    const res = await apiClient.post(unavailableItemsPath(groupId), body);
    return unavailableItemReportsResponseSchema.parse(res.data).requests;
  },
};
