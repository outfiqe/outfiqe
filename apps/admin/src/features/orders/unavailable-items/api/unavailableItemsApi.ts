import { apiClient } from "@/lib/apiClient";

import {
  type UnavailableItemPage,
  unavailableItemPageSchema,
  type UnavailableItemRequest,
  unavailableItemRequestSchema,
  type UnavailableItemStatus,
} from "./unavailableItemsSchemas";

const UNAVAILABLE_ITEMS_PATH = "/orders/admin/unavailable-items";

export const unavailableItemsApi = {
  async list(status: UnavailableItemStatus, cursor?: string): Promise<UnavailableItemPage> {
    const params = new URLSearchParams({ status });
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get(`${UNAVAILABLE_ITEMS_PATH}?${params.toString()}`);
    return unavailableItemPageSchema.parse(res.data);
  },

  async approve(requestId: string): Promise<UnavailableItemRequest> {
    const res = await apiClient.post(`${UNAVAILABLE_ITEMS_PATH}/${requestId}/approve`);
    return unavailableItemRequestSchema.parse(res.data);
  },

  async reject(requestId: string, note: string): Promise<UnavailableItemRequest> {
    const res = await apiClient.post(`${UNAVAILABLE_ITEMS_PATH}/${requestId}/reject`, { note });
    return unavailableItemRequestSchema.parse(res.data);
  },
};
