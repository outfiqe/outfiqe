import { apiClient } from "@/lib/apiClient";

import {
  type CreateRiderPayRateBody,
  type RiderEarning,
  type RiderEarningPage,
  riderEarningPageSchema,
  riderEarningSchema,
  type RiderEarningStatus,
  type RiderPayRate,
  type RiderPayRates,
  riderPayRateSchema,
  riderPayRatesSchema,
} from "./riderPaySchemas";

const RATES_PATH = "/logistics/admin/rider-pay-rates";
const EARNINGS_PATH = "/logistics/admin/rider-earnings";

export const riderPayApi = {
  async getRates(countryCode: string): Promise<RiderPayRates> {
    const res = await apiClient.get(RATES_PATH, { params: { countryCode } });
    return riderPayRatesSchema.parse(res.data);
  },

  async createRate(body: CreateRiderPayRateBody): Promise<RiderPayRate> {
    const res = await apiClient.post(RATES_PATH, body);
    return riderPayRateSchema.parse(res.data);
  },

  async deactivateRate(rateId: string): Promise<RiderPayRate> {
    const res = await apiClient.post(`${RATES_PATH}/${rateId}/deactivate`);
    return riderPayRateSchema.parse(res.data);
  },

  async listEarnings(
    status: RiderEarningStatus | null,
    cursor?: string,
  ): Promise<RiderEarningPage> {
    const res = await apiClient.get(EARNINGS_PATH, {
      params: { cursor, ...(status ? { status } : {}) },
    });
    return riderEarningPageSchema.parse(res.data);
  },

  async voidEarning(earningId: string, reason: string): Promise<RiderEarning> {
    const res = await apiClient.post(`${EARNINGS_PATH}/${earningId}/void`, { reason });
    return riderEarningSchema.parse(res.data);
  },
};
