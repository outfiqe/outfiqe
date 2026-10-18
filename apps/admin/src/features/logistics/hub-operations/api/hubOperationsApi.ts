import { IDEMPOTENCY_HEADER } from "@outfiqe/client";

import { apiClient } from "@/lib/apiClient";

import {
  type CheckInPickupBody,
  type InspectionLine,
  type OrdersToPackPage,
  ordersToPackPageSchema,
  type PackedParcel,
  packedParcelSchema,
  type PackParcelBody,
  type ParcelHandover,
  parcelHandoverSchema,
  type PickupCheckIn,
  pickupCheckInSchema,
  pickupInspectionSchema,
} from "./hubOperationsSchemas";

const HUB_PATH = "/logistics/hub";

export const hubOperationsApi = {
  async checkInPickup(body: CheckInPickupBody, idempotencyKey: string): Promise<PickupCheckIn> {
    const res = await apiClient.post(`${HUB_PATH}/check-ins`, body, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return pickupCheckInSchema.parse(res.data);
  },

  async listOrdersToPack(hubId: string, cursor?: string): Promise<OrdersToPackPage> {
    const res = await apiClient.get(`${HUB_PATH}/orders-to-pack`, { params: { hubId, cursor } });
    return ordersToPackPageSchema.parse(res.data);
  },

  async recordInspection(groupId: string, lines: InspectionLine[], note?: string) {
    const res = await apiClient.post(`${HUB_PATH}/pickups/${groupId}/inspection`, {
      lines,
      ...(note ? { note } : {}),
    });
    return pickupInspectionSchema.parse(res.data);
  },

  async packParcel(orderId: string, body: PackParcelBody): Promise<PackedParcel> {
    const res = await apiClient.post(`${HUB_PATH}/orders/${orderId}/parcels`, body);
    return packedParcelSchema.parse(res.data);
  },

  async handOverParcel(
    body: { hubId: string; code: string },
    idempotencyKey: string,
  ): Promise<ParcelHandover> {
    const res = await apiClient.post(`${HUB_PATH}/handovers`, body, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return parcelHandoverSchema.parse(res.data);
  },
};
