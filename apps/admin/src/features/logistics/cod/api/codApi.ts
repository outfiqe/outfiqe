import { apiClient } from "@/lib/apiClient";

import {
  type CodPartnerSummary,
  type CodRemittanceDetail,
  codRemittanceDetailSchema,
  type CodRemittancePage,
  codRemittancePageSchema,
  codSummaryResponseSchema,
  type RecordCodRemittanceBody,
  type UnremittedParcelPage,
  unremittedParcelPageSchema,
} from "./codSchemas";

const COD_PATH = "/logistics/admin/cod";
const REMITTANCES_PATH = `${COD_PATH}/remittances`;

export const codApi = {
  async getSummary(): Promise<CodPartnerSummary[]> {
    const res = await apiClient.get(`${COD_PATH}/summary`);
    return codSummaryResponseSchema.parse(res.data).partners;
  },

  async listUnremittedParcels(
    partnerId: string,
    onlyOverdue: boolean,
    cursor?: string,
  ): Promise<UnremittedParcelPage> {
    const res = await apiClient.get(`${COD_PATH}/parcels`, {
      params: { partnerId, onlyOverdue: String(onlyOverdue), cursor },
    });
    return unremittedParcelPageSchema.parse(res.data);
  },

  async listRemittances(partnerId: string, cursor?: string): Promise<CodRemittancePage> {
    const res = await apiClient.get(REMITTANCES_PATH, { params: { partnerId, cursor } });
    return codRemittancePageSchema.parse(res.data);
  },

  async getRemittance(remittanceId: string): Promise<CodRemittanceDetail> {
    const res = await apiClient.get(`${REMITTANCES_PATH}/${remittanceId}`);
    return codRemittanceDetailSchema.parse(res.data);
  },

  async recordRemittance(body: RecordCodRemittanceBody): Promise<CodRemittanceDetail> {
    const res = await apiClient.post(REMITTANCES_PATH, body);
    return codRemittanceDetailSchema.parse(res.data);
  },
};
