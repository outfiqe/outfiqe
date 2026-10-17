import { apiClient } from "@/lib/apiClient";

import {
  type ParcelBooking,
  parcelBookingSchema,
} from "../../hub-operations/api/hubOperationsSchemas";
import {
  type ParcelDetail,
  parcelDetailSchema,
  type ParcelLabel,
  parcelLabelSchema,
  type ParcelPage,
  parcelPageSchema,
  type ParcelQueue,
  type RecordParcelUpdateBody,
} from "./parcelsSchemas";

const HUB_SHIPMENTS_PATH = "/logistics/hub/shipments";

export const parcelsApi = {
  async listParcels(hubId: string, queue: ParcelQueue, cursor?: string): Promise<ParcelPage> {
    const res = await apiClient.get(HUB_SHIPMENTS_PATH, { params: { hubId, queue, cursor } });
    return parcelPageSchema.parse(res.data);
  },

  async getParcel(shipmentId: string): Promise<ParcelDetail> {
    const res = await apiClient.get(`${HUB_SHIPMENTS_PATH}/${shipmentId}`);
    return parcelDetailSchema.parse(res.data);
  },

  async recordManualBooking(shipmentId: string, partnerReference: string): Promise<ParcelBooking> {
    const res = await apiClient.post(`${HUB_SHIPMENTS_PATH}/${shipmentId}/booking`, {
      partnerReference,
    });
    return parcelBookingSchema.parse(res.data);
  },

  async rebookParcel(
    shipmentId: string,
    body: { partnerId: string; reason: string },
  ): Promise<ParcelBooking> {
    const res = await apiClient.post(`${HUB_SHIPMENTS_PATH}/${shipmentId}/rebook`, body);
    return parcelBookingSchema.parse(res.data);
  },

  async getLabel(shipmentId: string): Promise<ParcelLabel> {
    const res = await apiClient.get(`${HUB_SHIPMENTS_PATH}/${shipmentId}/label`);
    return parcelLabelSchema.parse(res.data);
  },

  async markLabelPrinted(shipmentId: string): Promise<ParcelLabel> {
    const res = await apiClient.post(`${HUB_SHIPMENTS_PATH}/${shipmentId}/label-printed`);
    return parcelLabelSchema.parse(res.data);
  },

  async recordUpdate(shipmentId: string, body: RecordParcelUpdateBody): Promise<ParcelDetail> {
    const res = await apiClient.post(`${HUB_SHIPMENTS_PATH}/${shipmentId}/events`, body);
    return parcelDetailSchema.parse(res.data);
  },
};
