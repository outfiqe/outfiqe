import { apiClient } from "@/shared/lib/apiClient";

import {
  type BrandShipmentDetail,
  brandShipmentDetailSchema,
  type BrandShipmentsPage,
  brandShipmentsPageSchema,
} from "./brandFulfilmentSchemas";

export type AdvanceShipmentInput = {
  status: "PACKED" | "SHIPPED" | "DELIVERED";
  carrier?: string;
  trackingNumber?: string;
};

const BASE_PATH = "/orders/brand/fulfilment-groups";

export const brandFulfilmentApi = {
  async list(cursor?: string): Promise<BrandShipmentsPage> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<BrandShipmentsPage>(`${BASE_PATH}${query}`);
    return brandShipmentsPageSchema.parse(res.data);
  },

  async get(groupId: string): Promise<BrandShipmentDetail> {
    const res = await apiClient.get<BrandShipmentDetail>(`${BASE_PATH}/${groupId}`);
    return brandShipmentDetailSchema.parse(res.data);
  },

  async advance(groupId: string, input: AdvanceShipmentInput): Promise<BrandShipmentDetail> {
    const res = await apiClient.patch<BrandShipmentDetail>(`${BASE_PATH}/${groupId}`, input);
    return brandShipmentDetailSchema.parse(res.data);
  },

  async requestCancellation(groupId: string, reason: string): Promise<void> {
    await apiClient.post(`${BASE_PATH}/${groupId}/request-cancellation`, { reason });
  },
};
