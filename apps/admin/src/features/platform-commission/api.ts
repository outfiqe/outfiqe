import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type BrandCommissionExemption,
  brandCommissionExemptionSchema,
  type BrandSearchResult,
  brandSearchResultSchema,
  type FeeTypeValue,
  type GatewayFeeRate,
  gatewayFeeRateSchema,
  type GatewayPaymentMethodValue,
  type PlatformCommissionRule,
  platformCommissionRuleSchema,
} from "./schemas";

const BRAND_SEARCH_RESULT_LIMIT = 8;

const ruleListSchema = z.array(platformCommissionRuleSchema);
const gatewayFeeRateListSchema = z.array(gatewayFeeRateSchema);
const exemptionListSchema = z.array(brandCommissionExemptionSchema);
const brandSearchResultListSchema = z.array(brandSearchResultSchema);

export type CreateTierInput = {
  minPrice: number;
  maxPrice: number | null;
  feeType: FeeTypeValue;
  flatAmount?: number;
  ratePercent?: number;
};

export type CreateGatewayFeeRateInput = {
  paymentMethod: GatewayPaymentMethodValue;
  ratePercent: number;
};

export type CreateBrandCommissionExemptionInput = {
  brandId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

export const platformCommissionApi = {
  async listRules(): Promise<PlatformCommissionRule[]> {
    const res = await apiClient.get<PlatformCommissionRule[]>("/brand-payouts/commission-rules");
    return ruleListSchema.parse(res.data);
  },

  async createRule(tiers: CreateTierInput[]): Promise<PlatformCommissionRule> {
    const res = await apiClient.post<PlatformCommissionRule>("/brand-payouts/commission-rules", {
      tiers,
    });
    return platformCommissionRuleSchema.parse(res.data);
  },

  async listGatewayFeeRates(): Promise<GatewayFeeRate[]> {
    const res = await apiClient.get<GatewayFeeRate[]>("/brand-payouts/gateway-fee-rates");
    return gatewayFeeRateListSchema.parse(res.data);
  },

  async createGatewayFeeRate(input: CreateGatewayFeeRateInput): Promise<GatewayFeeRate> {
    const res = await apiClient.post<GatewayFeeRate>("/brand-payouts/gateway-fee-rates", input);
    return gatewayFeeRateSchema.parse(res.data);
  },

  async listExemptions(): Promise<BrandCommissionExemption[]> {
    const res = await apiClient.get<BrandCommissionExemption[]>("/brand-payouts/exemptions");
    return exemptionListSchema.parse(res.data);
  },

  async createExemption(
    input: CreateBrandCommissionExemptionInput,
  ): Promise<BrandCommissionExemption> {
    const res = await apiClient.post<BrandCommissionExemption>("/brand-payouts/exemptions", input);
    return brandCommissionExemptionSchema.parse(res.data);
  },

  async revokeExemption(id: string): Promise<void> {
    await apiClient.patch(`/brand-payouts/exemptions/${id}/revoke`);
  },

  async searchBrands(q: string): Promise<BrandSearchResult[]> {
    const res = await apiClient.get<{ brands: BrandSearchResult[] }>("/brands", {
      params: { q, limit: BRAND_SEARCH_RESULT_LIMIT },
    });
    return brandSearchResultListSchema.parse(res.data.brands);
  },
};
