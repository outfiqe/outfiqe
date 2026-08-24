import { BrandPayoutStatus, PlatformFeeType } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { BASIS_POINTS_PER_PERCENT } from "./brandPayout.constants.js";
import { brandPayoutRepository } from "./brandPayout.repository.js";
import type {
  CreateBrandCommissionExemptionBody,
  CreateGatewayFeeRateBody,
  CreatePlatformCommissionRuleBody,
  ListBrandPayoutsQuery,
} from "./brandPayout.schemas.js";
import type {
  BrandCommissionExemptionView,
  BrandPayoutSummary,
  BrandPayoutView,
  GatewayFeeRateView,
  PlatformCommissionRuleView,
  PlatformCommissionTierInput,
} from "./brandPayout.types.js";
import {
  toBrandCommissionExemptionView,
  toBrandPayoutView,
  toGatewayFeeRateView,
  toPlatformCommissionRuleView,
} from "./brandPayout.utils.js";

const NOT_FOUND_STATUS = 404;

export const brandPayoutService = {
  async listRules(): Promise<PlatformCommissionRuleView[]> {
    const rules = await brandPayoutRepository.listRulesWithTiers();
    return rules.map(toPlatformCommissionRuleView);
  },

  async createRule(
    input: CreatePlatformCommissionRuleBody,
    adminId: string,
  ): Promise<PlatformCommissionRuleView> {
    const tiers: PlatformCommissionTierInput[] = input.tiers.map((tier) => ({
      minPrice: tier.minPrice,
      maxPrice: tier.maxPrice,
      feeType: tier.feeType,
      flatAmount: tier.feeType === PlatformFeeType.FLAT ? (tier.flatAmount ?? null) : null,
      ratePercentBasisPoints:
        tier.feeType === PlatformFeeType.PERCENT
          ? Math.round((tier.ratePercent ?? 0) * BASIS_POINTS_PER_PERCENT)
          : null,
    }));
    const rule = await brandPayoutRepository.createActiveRuleVersion(tiers, adminId);
    return toPlatformCommissionRuleView(rule);
  },

  async listGatewayFeeRates(): Promise<GatewayFeeRateView[]> {
    const rates = await brandPayoutRepository.listGatewayFeeRates();
    return rates.map(toGatewayFeeRateView);
  },

  async createGatewayFeeRate(
    input: CreateGatewayFeeRateBody,
    adminId: string,
  ): Promise<GatewayFeeRateView> {
    const ratePercentBasisPoints = Math.round(input.ratePercent * BASIS_POINTS_PER_PERCENT);
    const rate = await brandPayoutRepository.createActiveGatewayFeeRateVersion(
      input.paymentMethod,
      ratePercentBasisPoints,
      adminId,
    );
    return toGatewayFeeRateView(rate);
  },

  async listExemptions(brandId?: string): Promise<BrandCommissionExemptionView[]> {
    const rows = await brandPayoutRepository.listExemptions(brandId);
    return rows.map(toBrandCommissionExemptionView);
  },

  async createExemption(
    input: CreateBrandCommissionExemptionBody,
    adminId: string,
  ): Promise<BrandCommissionExemptionView> {
    const row = await brandPayoutRepository.createExemption(input, adminId);
    return toBrandCommissionExemptionView(row);
  },

  async revokeExemption(id: string, adminId: string): Promise<void> {
    const revoked = await brandPayoutRepository.revokeExemption(id, adminId);
    if (!revoked) {
      throw new AppError("NOT_FOUND", "Exemption not found or already revoked.", NOT_FOUND_STATUS);
    }
  },

  async getSummary(brandId: string): Promise<BrandPayoutSummary> {
    const sums = await brandPayoutRepository.sumByStatusForBrand(brandId);
    const pending = sums[BrandPayoutStatus.PENDING] ?? 0;
    const available = sums[BrandPayoutStatus.AVAILABLE] ?? 0;
    const withdrawn = sums[BrandPayoutStatus.WITHDRAWN] ?? 0;

    return { totalPayouts: pending + available + withdrawn, pending, available, withdrawn };
  },

  async listForBrand(
    brandId: string,
    { cursor, limit }: ListBrandPayoutsQuery,
  ): Promise<{ items: BrandPayoutView[]; nextCursor: string | null }> {
    const rows = await brandPayoutRepository.listForBrand(brandId, { cursor, limit });
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return { items: pagedRows.map(toBrandPayoutView), nextCursor };
  },
};
