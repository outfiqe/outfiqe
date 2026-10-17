import { apiClient } from "@/lib/apiClient";

import {
  type DeliveryPartner,
  type DeliveryPartnerBody,
  deliveryPartnerSchema,
  deliveryPartnersResponseSchema,
  type PartnerAccountBody,
  type PartnerStatusMapping,
  type PartnerZonesBody,
  type StatusImport,
  statusImportSchema,
} from "./partnersSchemas";

const PARTNERS_PATH = "/logistics/admin/partners";

export const partnersApi = {
  async listPartners(): Promise<DeliveryPartner[]> {
    const res = await apiClient.get(PARTNERS_PATH);
    return deliveryPartnersResponseSchema.parse(res.data).partners;
  },

  async getPartner(partnerId: string): Promise<DeliveryPartner> {
    const res = await apiClient.get(`${PARTNERS_PATH}/${partnerId}`);
    return deliveryPartnerSchema.parse(res.data);
  },

  async createPartner(body: DeliveryPartnerBody): Promise<DeliveryPartner> {
    const res = await apiClient.post(PARTNERS_PATH, body);
    return deliveryPartnerSchema.parse(res.data);
  },

  async updatePartner(partnerId: string, body: DeliveryPartnerBody): Promise<DeliveryPartner> {
    const res = await apiClient.put(`${PARTNERS_PATH}/${partnerId}`, body);
    return deliveryPartnerSchema.parse(res.data);
  },

  async saveAccount(
    partnerId: string,
    hubId: string,
    body: PartnerAccountBody,
  ): Promise<DeliveryPartner> {
    const res = await apiClient.put(`${PARTNERS_PATH}/${partnerId}/accounts/${hubId}`, body);
    return deliveryPartnerSchema.parse(res.data);
  },

  async replaceZones(partnerId: string, body: PartnerZonesBody): Promise<DeliveryPartner> {
    const res = await apiClient.put(`${PARTNERS_PATH}/${partnerId}/zones`, body);
    return deliveryPartnerSchema.parse(res.data);
  },

  async saveStatusMap(
    partnerId: string,
    mappings: PartnerStatusMapping[],
  ): Promise<DeliveryPartner> {
    const res = await apiClient.put(`${PARTNERS_PATH}/${partnerId}/status-map`, { mappings });
    return deliveryPartnerSchema.parse(res.data);
  },

  async importStatuses(
    partnerId: string,
    body: { fileName: string; csv: string },
  ): Promise<StatusImport> {
    const res = await apiClient.post(`${PARTNERS_PATH}/${partnerId}/status-imports`, body);
    return statusImportSchema.parse(res.data);
  },
};
